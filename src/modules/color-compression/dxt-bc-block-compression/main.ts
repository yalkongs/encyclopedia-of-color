import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, drawRGB } from '@core/math/quantization';

function dxtBlock(img: { w: number; h: number; data: Uint8ClampedArray }, paletteCount: number): { w: number; h: number; data: Uint8ClampedArray } {
  const out = new Uint8ClampedArray(img.data.length);
  const blk = 4;
  for (let by = 0; by < img.h; by += blk) for (let bx = 0; bx < img.w; bx += blk) {
    // Find min and max RGB in block (rough endpoint pick)
    let rMin = 255, gMin = 255, bMin = 255, rMax = 0, gMax = 0, bMax = 0;
    let lumMin = Infinity, lumMax = -Infinity;
    let cMinR = 0, cMinG = 0, cMinB = 0, cMaxR = 0, cMaxG = 0, cMaxB = 0;
    for (let yy = by; yy < Math.min(img.h, by + blk); yy++) for (let xx = bx; xx < Math.min(img.w, bx + blk); xx++) {
      const i = (yy * img.w + xx) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < lumMin) { lumMin = lum; cMinR = r; cMinG = g; cMinB = b; }
      if (lum > lumMax) { lumMax = lum; cMaxR = r; cMaxG = g; cMaxB = b; }
      if (r < rMin) rMin = r; if (g < gMin) gMin = g; if (b < bMin) bMin = b;
      if (r > rMax) rMax = r; if (g > gMax) gMax = g; if (b > bMax) bMax = b;
    }
    void rMin; void gMin; void bMin; void rMax; void gMax; void bMax;
    // Build palette: paletteCount lerp steps between min and max endpoints
    const palette: [number, number, number][] = [];
    for (let k = 0; k < paletteCount; k++) {
      const t = paletteCount === 1 ? 0 : k / (paletteCount - 1);
      palette.push([
        Math.round(cMinR * (1 - t) + cMaxR * t),
        Math.round(cMinG * (1 - t) + cMaxG * t),
        Math.round(cMinB * (1 - t) + cMaxB * t),
      ]);
    }
    // Quantize block pixels to nearest palette
    for (let yy = by; yy < Math.min(img.h, by + blk); yy++) for (let xx = bx; xx < Math.min(img.w, bx + blk); xx++) {
      const i = (yy * img.w + xx) * 4;
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      let bestD = Infinity, best = palette[0];
      for (const p of palette) {
        const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
        if (d < bestD) { bestD = d; best = p; }
      }
      out[i] = best[0]; out[i + 1] = best[1]; out[i + 2] = best[2]; out[i + 3] = 255;
    }
  }
  return { w: img.w, h: img.h, data: out };
}

class DXT {
  private stage: CanvasStage;
  private bits = 2;
  private src = syntheticRGBImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bits = hydrateNumber('bits', 2);
    const s = document.getElementById('bits') as EncSlider; s.value = this.bits;
    s.addEventListener('input', (e) => { this.bits = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('bits', () => Math.round(this.bits));
    document.addEventListener('reset-params', () => { this.bits = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const palCount = [2, 4, 8, 16][this.bits - 1];
    const out = dxtBlock(this.src, palCount);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`BC-style: 2 endpoints + ${palCount}-entry interpolated palette per 4×4 block`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original (truecolor)', M + imgW / 2, M + 26);
    drawRGB(g, this.src, M, M + 30, scale);

    g.fillText(`block-compressed (palette=${palCount})`, M + imgW + 30 + imgW / 2, M + 26);
    drawRGB(g, out, M + imgW + 30, M + 30, scale);

    // Block diagram
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('BC1 block layout: 2 endpoint colours + 16 × 2-bit indices = 64 bits / 16 px = 4 bpp', M, ky);

    const cell = 28;
    const bx = M, by = ky + 18;
    // 4x4 block of indices
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
      const t = ((xx + yy) % palCount) / Math.max(1, palCount - 1);
      const r = Math.round(50 + 180 * t), gc = Math.round(80 + 100 * t), b = Math.round(140 + 80 * (1 - t));
      g.fillStyle = `rgb(${r},${gc},${b})`;
      g.fillRect(bx + xx * cell, by + yy * cell, cell - 1, cell - 1);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx + xx * cell, by + yy * cell, cell - 1, cell - 1);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('16 pixels', bx + 2 * cell, by + 4 * cell + 14);

    // Endpoint colours
    g.fillStyle = '#1f3a8a'; g.fillRect(bx + 4 * cell + 30, by, 40, 40);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx + 4 * cell + 30, by, 40, 40);
    g.fillStyle = '#c2382c'; g.fillRect(bx + 4 * cell + 30, by + 50, 40, 40);
    g.strokeRect(bx + 4 * cell + 30, by + 50, 40, 40);
    g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'left';
    g.fillText('endpoint 0', bx + 4 * cell + 80, by + 22);
    g.fillText('endpoint 1', bx + 4 * cell + 80, by + 72);
    g.font = '10px serif'; g.fillStyle = theme.inkAlpha(0.7);
    g.fillText('RGB565 = 16 bits each', bx + 4 * cell + 80, by + 36);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('BC family (BC1–BC7) is the standard GPU texture format. BC7 trades 8 bpp for near-uncompressed quality.', M, h - M);
  }
}

new DXT();
