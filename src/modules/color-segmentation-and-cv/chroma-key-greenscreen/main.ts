import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function buildScene(): { w: number; h: number; data: Uint8ClampedArray } {
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 60, g = 200, b = 70; // green screen
    // Subject: head + body
    const cx = w / 2, cy = h * 0.35;
    if ((x - cx) ** 2 + (y - cy) ** 2 < 70) { r = 200; g = 150; b = 130; } // face
    if (y > h * 0.45 && y < h * 0.85 && Math.abs(x - cx) < 18) { r = 90; g = 50; b = 130; } // shirt
    // Hair
    if ((x - cx) ** 2 + (y - cy - 8) ** 2 < 70 && y < cy - 4) { r = 50; g = 30; b = 20; }
    const off = (y * w + x) * 4;
    d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  return { w, h, data: d };
}

function buildBackground(): { w: number; h: number; data: Uint8ClampedArray } {
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  // Sky-to-sand gradient
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = y / h;
    const r = Math.round(80 + 160 * t);
    const g = Math.round(140 + 90 * t);
    const b = Math.round(220 - 100 * t);
    const off = (y * w + x) * 4;
    d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  return { w, h, data: d };
}

class ChromaKey {
  private stage: CanvasStage;
  private eps = 0.15;
  private fg = buildScene();
  private bg = buildBackground();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.eps = hydrateNumber('eps', 0.15);
    const s = document.getElementById('eps') as EncSlider; s.value = this.eps;
    s.addEventListener('input', (e) => { this.eps = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('eps', () => this.eps.toFixed(2));
    document.addEventListener('reset-params', () => { this.eps = 0.15; s.value = 0.15; this.draw(); notifyStateChange(); });
  }

  private composite(): { w: number; h: number; data: Uint8ClampedArray; mask: Uint8ClampedArray } {
    const N = this.fg.w * this.fg.h;
    const out = new Uint8ClampedArray(this.fg.data.length);
    const mask = new Uint8ClampedArray(N);
    for (let i = 0; i < N; i++) {
      const r = this.fg.data[i * 4] / 255;
      const g = this.fg.data[i * 4 + 1] / 255;
      const b = this.fg.data[i * 4 + 2] / 255;
      // green dominance: how much greener than max(r,b)?
      const dom = g - Math.max(r, b);
      const alpha = dom > this.eps ? 0 : 1;
      mask[i] = alpha * 255;
      const a = alpha;
      out[i * 4] = Math.round(this.fg.data[i * 4] * a + this.bg.data[i * 4] * (1 - a));
      out[i * 4 + 1] = Math.round(this.fg.data[i * 4 + 1] * a + this.bg.data[i * 4 + 1] * (1 - a));
      out[i * 4 + 2] = Math.round(this.fg.data[i * 4 + 2] * a + this.bg.data[i * 4 + 2] * (1 - a));
      out[i * 4 + 3] = 255;
    }
    return { w: this.fg.w, h: this.fg.h, data: out, mask };
  }

  private drawRGB(g: CanvasRenderingContext2D, img: { w: number; h: number; data: Uint8ClampedArray }, x: number, y: number, scale = 4) {
    const id = g.createImageData(img.w * scale, img.h * scale);
    for (let py = 0; py < img.h; py++) for (let px = 0; px < img.w; px++) {
      const src = (py * img.w + px) * 4;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * img.w * scale + (px * scale + dx)) * 4;
        id.data[dst] = img.data[src]; id.data[dst + 1] = img.data[src + 1]; id.data[dst + 2] = img.data[src + 2]; id.data[dst + 3] = 255;
      }
    }
    g.putImageData(id, x, y);
  }

  private drawMask(g: CanvasRenderingContext2D, mask: Uint8ClampedArray, ww: number, hh: number, x: number, y: number, scale = 4) {
    const id = g.createImageData(ww * scale, hh * scale);
    for (let py = 0; py < hh; py++) for (let px = 0; px < ww; px++) {
      const m = mask[py * ww + px];
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * ww * scale + (px * scale + dx)) * 4;
        id.data[dst] = m; id.data[dst + 1] = m; id.data[dst + 2] = m; id.data[dst + 3] = 255;
      }
    }
    g.putImageData(id, x, y);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const comp = this.composite();

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`ε = ${this.eps.toFixed(2)} · green-screen chroma key`, M, M);

    const scale = 4;
    const imgW = this.fg.w * scale, imgH = this.fg.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('foreground (green-screen)', M + imgW / 2, M + 26);
    this.drawRGB(g, this.fg, M, M + 30, scale);

    g.fillText('background plate', M + imgW + 30 + imgW / 2, M + 26);
    this.drawRGB(g, this.bg, M + imgW + 30, M + 30, scale);

    g.fillText('alpha matte', M + 2 * (imgW + 30) + imgW / 2, M + 26);
    this.drawMask(g, comp.mask, this.fg.w, this.fg.h, M + 2 * (imgW + 30), M + 30, scale);

    // Composite
    const cy = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'center';
    g.fillText('composite (subject on new background)', M + imgW / 2, cy - 8);
    this.drawRGB(g, comp, M, cy, scale);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Vlahos 1971 colour-difference matte (Petro Vlahos, Oscar 1995). Modern matte engines extend with edge despill + spill suppression.', M, h - M);
  }
}

new ChromaKey();
