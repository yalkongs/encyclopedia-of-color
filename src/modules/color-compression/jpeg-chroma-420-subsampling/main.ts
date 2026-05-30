import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, drawRGB } from '@core/math/quantization';

const SCHEMES = [
  { name: '4:4:4 (no subsampling)', dx: 1, dy: 1, bits: '24 bpp' },
  { name: '4:2:2 (horiz halved)', dx: 2, dy: 1, bits: '16 bpp' },
  { name: '4:2:0 (both halved)', dx: 2, dy: 2, bits: '12 bpp' },
];

function rgbToYCbCr(r: number, g: number, b: number): [number, number, number] {
  const Y = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
  const Cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;
  return [Y, Cb, Cr];
}

function ycbcrToRgb(Y: number, Cb: number, Cr: number): [number, number, number] {
  const r = Y + 1.402 * (Cr - 128);
  const g = Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128);
  const b = Y + 1.772 * (Cb - 128);
  return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
}

function subsample(img: { w: number; h: number; data: Uint8ClampedArray }, dx: number, dy: number): { w: number; h: number; data: Uint8ClampedArray } {
  const Y = new Float32Array(img.w * img.h);
  const Cb = new Float32Array(img.w * img.h);
  const Cr = new Float32Array(img.w * img.h);
  for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
    const [yV, cbV, crV] = rgbToYCbCr(img.data[i], img.data[i + 1], img.data[i + 2]);
    Y[j] = yV; Cb[j] = cbV; Cr[j] = crV;
  }
  // Down-up sample Cb, Cr
  const out = new Uint8ClampedArray(img.data.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = y * img.w + x;
    // Average over dx × dy block
    const bx = Math.floor(x / dx) * dx, by = Math.floor(y / dy) * dy;
    let sCb = 0, sCr = 0, n = 0;
    for (let yy = by; yy < Math.min(img.h, by + dy); yy++) for (let xx = bx; xx < Math.min(img.w, bx + dx); xx++) {
      sCb += Cb[yy * img.w + xx]; sCr += Cr[yy * img.w + xx]; n++;
    }
    const cbS = sCb / n, crS = sCr / n;
    const [r, g, b] = ycbcrToRgb(Y[i], cbS, crS);
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  }
  return { w: img.w, h: img.h, data: out };
}

class ChromaSub {
  private stage: CanvasStage;
  private s = 3;
  private src = syntheticRGBImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.s = hydrateNumber('s', 3);
    const sl = document.getElementById('s') as EncSlider; sl.value = this.s;
    sl.addEventListener('input', (e) => { this.s = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('s', () => Math.round(this.s));
    document.addEventListener('reset-params', () => { this.s = 3; sl.value = 3; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = SCHEMES[this.s - 1];
    const out = subsample(this.src, sel.dx, sel.dy);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} · effective ${sel.bits}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original (4:4:4)', M + imgW / 2, M + 26);
    drawRGB(g, this.src, M, M + 30, scale);

    g.fillText(`subsampled (${sel.name.split(' ')[0]})`, M + imgW + 30 + imgW / 2, M + 26);
    drawRGB(g, out, M + imgW + 30, M + 30, scale);

    // Block-size diagram
    const dy = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('sample block (4 × 4 luma pixels)', M, dy);
    const cell = 22;
    // Y samples (4×4)
    g.fillStyle = theme.ink;
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
      g.fillStyle = '#f0f0f0';
      g.fillRect(M + xx * cell, dy + 10 + yy * cell, cell - 1, cell - 1);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + xx * cell, dy + 10 + yy * cell, cell - 1, cell - 1);
      g.fillStyle = '#222'; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('Y', M + xx * cell + cell / 2, dy + 10 + yy * cell + cell / 2 + 3);
    }
    // Chroma overlay
    const cbX = M + 4 * cell + 30;
    for (let yy = 0; yy < 4; yy += sel.dy) for (let xx = 0; xx < 4; xx += sel.dx) {
      const w0 = sel.dx * cell - 2, h0 = sel.dy * cell - 2;
      g.fillStyle = '#a8d0f8';
      g.fillRect(cbX + xx * cell, dy + 10 + yy * cell, w0, h0);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(cbX + xx * cell, dy + 10 + yy * cell, w0, h0);
      g.fillStyle = '#222'; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('CbCr', cbX + xx * cell + w0 / 2, dy + 10 + yy * cell + h0 / 2 + 3);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText(`luma per pixel · chroma per ${sel.dx}×${sel.dy} block`, M, dy + 110);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Eye has 10× higher spatial resolution for luminance than chrominance — 4:2:0 saves ~33 % bits with little visible loss on natural images.', M, h - M);
  }
}

new ChromaSub();
