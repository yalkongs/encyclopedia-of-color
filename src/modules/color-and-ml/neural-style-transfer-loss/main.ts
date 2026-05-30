import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function contentScene(): { w: number; h: number; data: Uint8ClampedArray } {
  // Simple landscape photograph stand-in
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    if (y < h * 0.5) { r = 130; g = 170; b = 220; } else if (y < h * 0.65) { r = 100; g = 100; b = 110; } else { r = 70; g = 130; b = 50; }
    const off = (y * w + x) * 4; d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  return { w, h, data: d };
}

function styleScene(): { w: number; h: number; data: Uint8ClampedArray } {
  // Van Gogh-ish swirls
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const angle = Math.atan2(y - h / 2, x - w / 2) + 0.04 * Math.sin(x * 0.4) + 0.04 * Math.cos(y * 0.5);
    const r = Math.round(100 + 100 * Math.sin(angle * 4));
    const g = Math.round(120 + 100 * Math.sin(angle * 4 + 1.5));
    const b = Math.round(180 + 60 * Math.cos(angle * 3));
    const off = (y * w + x) * 4; d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  return { w, h, data: d };
}

function blend(c: { w: number; h: number; data: Uint8ClampedArray }, s: { w: number; h: number; data: Uint8ClampedArray }, w: number): { w: number; h: number; data: Uint8ClampedArray } {
  const out = new Uint8ClampedArray(c.data.length);
  for (let i = 0; i < c.data.length; i += 4) {
    out[i] = Math.round(c.data[i] * (1 - w) + s.data[i] * w);
    out[i + 1] = Math.round(c.data[i + 1] * (1 - w) + s.data[i + 1] * w);
    out[i + 2] = Math.round(c.data[i + 2] * (1 - w) + s.data[i + 2] * w);
    out[i + 3] = 255;
  }
  return { w: c.w, h: c.h, data: out };
}

function drawImg(g: CanvasRenderingContext2D, img: { w: number; h: number; data: Uint8ClampedArray }, x: number, y: number, scale: number) {
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

class StyleTransfer {
  private stage: CanvasStage;
  private w0 = 0.5;
  private content = contentScene();
  private style = styleScene();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.w0 = hydrateNumber('w', 0.5);
    const s = document.getElementById('w') as EncSlider; s.value = this.w0;
    s.addEventListener('input', (e) => { this.w0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('w', () => this.w0.toFixed(2));
    document.addEventListener('reset-params', () => { this.w0 = 0.5; s.value = 0.5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = blend(this.content, this.style, this.w0);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`α (content) = ${(1 - this.w0).toFixed(2)} · β (style) = ${this.w0.toFixed(2)}`, M, M);

    const scale = 4;
    const imgW = this.content.w * scale, imgH = this.content.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('content image (photo)', M + imgW / 2, M + 26);
    drawImg(g, this.content, M, M + 30, scale);

    g.fillText('style image (painting)', M + imgW + 30 + imgW / 2, M + 26);
    drawImg(g, this.style, M + imgW + 30, M + 30, scale);

    g.fillText('stylised output', M + 2 * (imgW + 30) + imgW / 2, M + 26);
    drawImg(g, out, M + 2 * (imgW + 30), M + 30, scale);

    // Loss equation
    const ey = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Total loss = α · content-loss + β · style-loss', M, ey);
    g.font = '11px serif'; g.fillStyle = theme.inkAlpha(0.8);
    g.fillText('content-loss = ‖VGG_content(x) − VGG_content(p)‖² (mid layers)', M + 20, ey + 20);
    g.fillText('style-loss   = Σ_l ‖Gram(VGG_l(x)) − Gram(VGG_l(s))‖² (all layers, Gram matrix = feature correlations)', M + 20, ey + 36);
    g.fillStyle = theme.inkAlpha(0.7);
    g.fillText('Optimisation: ∂L/∂x via backprop, gradient descent on the pixels themselves (or distilled into a feed-forward network).', M + 20, ey + 56);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Gatys 2015: original optimisation took 5 min per image. Johnson 2016 fast-style trains a feedforward net → real-time.', M, h - M);
  }
}

new StyleTransfer();
