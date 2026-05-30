import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawRGB, RGB, drawPalette } from '@core/math/quantization';

function portraitScene(): { w: number; h: number; data: Uint8ClampedArray } {
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  // Mostly grey sky background
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const off = (y * w + x) * 4;
    d[off] = 180; d[off + 1] = 185; d[off + 2] = 195; d[off + 3] = 255;
  }
  // Centred portrait: hair, face, shirt
  const cx = w / 2, cy = h * 0.5;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const off = (y * w + x) * 4;
    const dx = (x - cx) / 14, dy = (y - cy + 4) / 16;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1 && y < cy + 8) { d[off] = 220; d[off + 1] = 175; d[off + 2] = 145; } // face
    if (r2 < 1.3 && y < cy - 4) { d[off] = 60; d[off + 1] = 30; d[off + 2] = 18; } // hair
    if (y > cy + 8 && y < cy + 26 && Math.abs(x - cx) < 18) { d[off] = 180; d[off + 1] = 40; d[off + 2] = 60; } // red shirt
  }
  return { w, h, data: d };
}

function attentionMap(w: number, h: number): Float32Array {
  // Centre-bias Gaussian
  const m = new Float32Array(w * h);
  const cx = w / 2, cy = h * 0.55;
  const sx = w / 4, sy = h / 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((y - cy) ** 2) / (2 * sy * sy));
    m[y * w + x] = v;
  }
  return m;
}

function weightedKMeans(img: { w: number; h: number; data: Uint8ClampedArray }, weights: Float32Array, k: number, alpha: number): RGB[] {
  // alpha=0 uniform, alpha=1 fully weighted
  const N = img.w * img.h;
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) w[i] = (1 - alpha) + alpha * weights[i];
  // Deterministic init: pick k pixels by weight
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => w[b] - w[a]);
  const cent = [] as { r: number; g: number; b: number; cap: number }[];
  for (let c = 0; c < k; c++) {
    const idx = order[Math.floor(c * N / k)];
    cent.push({ r: img.data[idx * 4], g: img.data[idx * 4 + 1], b: img.data[idx * 4 + 2], cap: 0 });
  }
  const assign = new Int32Array(N);
  for (let it = 0; it < 5; it++) {
    for (let i = 0; i < N; i++) {
      let best = 0, bestD = Infinity;
      const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2];
      for (let c = 0; c < k; c++) {
        const d = (r - cent[c].r) ** 2 + (g - cent[c].g) ** 2 + (b - cent[c].b) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      assign[i] = best;
    }
    const sumR = new Float64Array(k), sumG = new Float64Array(k), sumB = new Float64Array(k), wsum = new Float64Array(k);
    for (let i = 0; i < N; i++) {
      const c = assign[i]; const ww = w[i];
      sumR[c] += img.data[i * 4] * ww; sumG[c] += img.data[i * 4 + 1] * ww; sumB[c] += img.data[i * 4 + 2] * ww;
      wsum[c] += ww;
    }
    for (let c = 0; c < k; c++) {
      if (wsum[c] > 0) {
        cent[c].r = sumR[c] / wsum[c]; cent[c].g = sumG[c] / wsum[c]; cent[c].b = sumB[c] / wsum[c];
      }
    }
  }
  return cent.map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }));
}

class PaletteAttn {
  private stage: CanvasStage;
  private a = 0.6;
  private img = portraitScene();
  private attn = attentionMap(96, 64);

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.a = hydrateNumber('a', 0.6);
    const s = document.getElementById('a') as EncSlider; s.value = this.a;
    s.addEventListener('input', (e) => { this.a = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('a', () => this.a.toFixed(2));
    document.addEventListener('reset-params', () => { this.a = 0.6; s.value = 0.6; this.draw(); notifyStateChange(); });
  }

  private drawMask(g: CanvasRenderingContext2D, mask: Float32Array, ww: number, hh: number, x: number, y: number, scale: number) {
    const id = g.createImageData(ww * scale, hh * scale);
    for (let py = 0; py < hh; py++) for (let px = 0; px < ww; px++) {
      const m = Math.round(mask[py * ww + px] * 255);
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
    const pal = weightedKMeans(this.img, this.attn, 6, this.a);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`attention strength = ${this.a.toFixed(2)} (0 = uniform · 1 = subject-only)`, M, M);

    const scale = 4;
    const imgW = this.img.w * scale, imgH = this.img.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('input portrait', M + imgW / 2, M + 26);
    drawRGB(g, this.img, M, M + 30, scale);

    g.fillText('attention map (centre-bias)', M + imgW + 30 + imgW / 2, M + 26);
    this.drawMask(g, this.attn, this.img.w, this.img.h, M + imgW + 30, M + 30, scale);

    // Palette swatches
    const py = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('extracted palette (k = 6)', M, py);
    drawPalette(g, pal, M, py + 10, 60, 6);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Pro tools (Adobe Color, Coolors) use saliency-guided palette extraction so subject colours dominate, not the background.', M, h - M);
  }
}

new PaletteAttn();
