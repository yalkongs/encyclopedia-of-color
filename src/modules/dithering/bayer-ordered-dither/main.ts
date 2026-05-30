import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawImage } from '@core/math/convolution';
import { bayerOrdered, gradientImage } from '@core/math/dither';

class BayerDemo {
  private stage: CanvasStage;
  private s = 1;
  private l = 2;
  private src = gradientImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.s = hydrateNumber('s', 1);
    this.l = hydrateNumber('l', 2);
    const s1 = document.getElementById('s') as EncSlider; s1.value = this.s;
    const s2 = document.getElementById('l') as EncSlider; s2.value = this.l;
    s1.addEventListener('input', (e) => { this.s = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    s2.addEventListener('input', (e) => { this.l = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('s', () => Math.round(this.s));
    registerStateParam('l', () => Math.round(this.l));
    document.addEventListener('reset-params', () => { this.s = 1; this.l = 2; s1.value = 1; s2.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const mSize: 4 | 8 = this.s === 1 ? 4 : 8;
    const out = bayerOrdered(this.src, this.l, mSize);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Bayer ${mSize}×${mSize} · levels = ${this.l}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original gradient', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText(`Bayer ${mSize}×${mSize}`, M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, out, M + imgW + 30, M + 30, scale);

    // Threshold matrix
    const my = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText(`Bayer ${mSize}×${mSize} threshold matrix`, M, my);

    const bayer4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const bayer8 = [
      0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
      12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
      3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
      15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
    ];
    const matrix = mSize === 4 ? bayer4 : bayer8;
    const denom = mSize === 4 ? 16 : 64;
    const cell = mSize === 4 ? 30 : 18;
    const bx = M, by = my + 10;
    for (let yy = 0; yy < mSize; yy++) for (let xx = 0; xx < mSize; xx++) {
      const v = matrix[yy * mSize + xx];
      const t = v / denom;
      g.fillStyle = `rgb(${Math.round(t * 220 + 30)},${Math.round(t * 220 + 30)},${Math.round(t * 220 + 30)})`;
      g.fillRect(bx + xx * cell, by + yy * cell, cell - 1, cell - 1);
      g.fillStyle = t < 0.5 ? '#fff' : '#000'; g.font = mSize === 4 ? '11px serif' : '9px serif'; g.textAlign = 'center';
      g.fillText(String(v), bx + xx * cell + cell / 2, by + yy * cell + cell / 2 + 3);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, mSize * cell, mSize * cell);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Bayer matrices are designed via recursive Sierpinski-like construction to maximise spatial frequency separation.', M, h - M);
  }
}

new BayerDemo();
