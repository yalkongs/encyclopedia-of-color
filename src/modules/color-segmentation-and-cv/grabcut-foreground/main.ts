import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function buildScene(): { w: number; h: number; data: Uint8ClampedArray; bbox: [number, number, number, number] } {
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  // Background: textured noise
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = 80 + 30 * Math.sin(x * 0.4 + y * 0.2);
    const g = 100 + 30 * Math.cos(x * 0.3 - y * 0.4);
    const b = 130 + 25 * Math.sin(x * 0.5);
    const off = (y * w + x) * 4;
    d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  // Foreground subject: orange ellipse with brown core
  const cx = w * 0.55, cy = h * 0.5;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - cx) / 18, dy = (y - cy) / 16;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1) {
      const inner = Math.exp(-r2 * 2);
      const r = 200 + 30 * inner, g = 110 + 50 * inner, b = 60 + 30 * inner;
      const off = (y * w + x) * 4;
      d[off] = r; d[off + 1] = g; d[off + 2] = b;
    }
  }
  return { w, h, data: d, bbox: [Math.round(cx - 22), Math.round(cy - 20), Math.round(cx + 22), Math.round(cy + 20)] };
}

class GrabCut {
  private stage: CanvasStage;
  private pad = 6;
  private scene = buildScene();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pad = hydrateNumber('pad', 6);
    const s = document.getElementById('pad') as EncSlider; s.value = this.pad;
    s.addEventListener('input', (e) => { this.pad = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pad', () => Math.round(this.pad));
    document.addEventListener('reset-params', () => { this.pad = 6; s.value = 6; this.draw(); notifyStateChange(); });
  }

  private segment(): { mask: Uint8ClampedArray; bbox: [number, number, number, number] } {
    const { w, h, data, bbox } = this.scene;
    const padded: [number, number, number, number] = [
      Math.max(0, bbox[0] - this.pad), Math.max(0, bbox[1] - this.pad),
      Math.min(w - 1, bbox[2] + this.pad), Math.min(h - 1, bbox[3] + this.pad),
    ];
    // Compute FG mean from inside bbox; BG mean from outside
    let fgR = 0, fgG = 0, fgB = 0, fgN = 0;
    let bgR = 0, bgG = 0, bgB = 0, bgN = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const inside = x >= padded[0] && x <= padded[2] && y >= padded[1] && y <= padded[3];
      if (inside) {
        fgR += data[i * 4]; fgG += data[i * 4 + 1]; fgB += data[i * 4 + 2]; fgN++;
      } else {
        bgR += data[i * 4]; bgG += data[i * 4 + 1]; bgB += data[i * 4 + 2]; bgN++;
      }
    }
    fgR /= fgN; fgG /= fgN; fgB /= fgN;
    bgR /= bgN; bgG /= bgN; bgB /= bgN;
    const mask = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const dFG = (r - fgR) ** 2 + (g - fgG) ** 2 + (b - fgB) ** 2;
      const dBG = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;
      // Pixels outside bbox forced background
      const insideOuter = x >= padded[0] && x <= padded[2] && y >= padded[1] && y <= padded[3];
      mask[i] = (insideOuter && dFG < dBG) ? 255 : 0;
    }
    return { mask, bbox: padded };
  }

  private drawScene(g: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    const { w, h, data } = this.scene;
    const id = g.createImageData(w * scale, h * scale);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const src = (py * w + px) * 4;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * w * scale + (px * scale + dx)) * 4;
        id.data[dst] = data[src]; id.data[dst + 1] = data[src + 1]; id.data[dst + 2] = data[src + 2]; id.data[dst + 3] = 255;
      }
    }
    g.putImageData(id, x, y);
  }

  private drawMask(g: CanvasRenderingContext2D, mask: Uint8ClampedArray, x: number, y: number, scale: number) {
    const { w, h } = this.scene;
    const id = g.createImageData(w * scale, h * scale);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const m = mask[py * w + px];
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * w * scale + (px * scale + dx)) * 4;
        id.data[dst] = m; id.data[dst + 1] = m; id.data[dst + 2] = m; id.data[dst + 3] = 255;
      }
    }
    g.putImageData(id, x, y);
  }

  private drawCutout(g: CanvasRenderingContext2D, mask: Uint8ClampedArray, x: number, y: number, scale: number) {
    const { w, h, data } = this.scene;
    const id = g.createImageData(w * scale, h * scale);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const i = py * w + px;
      const src = i * 4;
      const inside = mask[i] > 128;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * w * scale + (px * scale + dx)) * 4;
        if (inside) {
          id.data[dst] = data[src]; id.data[dst + 1] = data[src + 1]; id.data[dst + 2] = data[src + 2]; id.data[dst + 3] = 255;
        } else {
          id.data[dst] = 240; id.data[dst + 1] = 232; id.data[dst + 2] = 216; id.data[dst + 3] = 255;
        }
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
    const seg = this.segment();

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`GrabCut (FG/BG mean approximation) · bbox padding = ${this.pad} px`, M, M);

    const scale = 4;
    const imgW = this.scene.w * scale;

    // Scene + bbox overlay
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('input + user bbox', M + imgW / 2, M + 26);
    this.drawScene(g, M, M + 30, scale);
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.strokeRect(M + seg.bbox[0] * scale, M + 30 + seg.bbox[1] * scale, (seg.bbox[2] - seg.bbox[0]) * scale, (seg.bbox[3] - seg.bbox[1]) * scale);

    // Mask
    g.fillText('FG mask', M + imgW + 30 + imgW / 2, M + 26);
    this.drawMask(g, seg.mask, M + imgW + 30, M + 30, scale);

    // Cutout
    g.fillText('extracted foreground', M + 2 * (imgW + 30) + imgW / 2, M + 26);
    this.drawCutout(g, seg.mask, M + 2 * (imgW + 30), M + 30, scale);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Full GrabCut uses 5-component GMMs + min-cut on a 8-connectivity graph. Our demo uses single-Gaussian means as illustration.', M, h - M);
  }
}

new GrabCut();
