import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticTestImage, bilateral, gaussianKernel, convolve2D, drawImage } from '@core/math/convolution';

class Bilateral {
  private stage: CanvasStage;
  private ss = 2;
  private sr = 0.1;
  private src = syntheticTestImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ss = hydrateNumber('ss', 2);
    this.sr = hydrateNumber('sr', 0.1);
    const s1 = document.getElementById('ss') as EncSlider; s1.value = this.ss;
    const s2 = document.getElementById('sr') as EncSlider; s2.value = this.sr;
    s1.addEventListener('input', (e) => { this.ss = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    s2.addEventListener('input', (e) => { this.sr = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ss', () => this.ss.toFixed(1));
    registerStateParam('sr', () => this.sr.toFixed(2));
    document.addEventListener('reset-params', () => {
      this.ss = 2; this.sr = 0.1; s1.value = 2; s2.value = 0.1;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const bil = bilateral(this.src, this.ss, this.sr);
    // Comparison: pure Gaussian at same σ_s
    const { kernel, size } = gaussianKernel(this.ss);
    const gauss = convolve2D(this.src, kernel, size);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`σ_s = ${this.ss.toFixed(1)} px · σ_r = ${this.sr.toFixed(2)}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText(`pure Gaussian σ=${this.ss.toFixed(1)}`, M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, gauss, M + imgW + 30, M + 30, scale);

    g.fillText(`bilateral σ_s=${this.ss.toFixed(1)} σ_r=${this.sr.toFixed(2)}`, M + 2 * (imgW + 30) + imgW / 2, M + 26);
    drawImage(g, bil, M + 2 * (imgW + 30), M + 30, scale);

    // Step profile (row 16) — show how bilateral keeps the edge sharp
    const py = M + 30 + imgH + 40;
    const ph = 100, pw = w - 2 * M;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(M, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('horizontal step profile (row 16): gray=original · blue=Gaussian · red=bilateral', M, py - 6);

    const row = 16;
    const X = (x: number) => M + (x / this.src.w) * pw;
    const Y = (v: number) => py + (1 - v) * ph;
    g.strokeStyle = theme.inkAlpha(0.45); g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x < this.src.w; x++) {
      const v = this.src.data[row * this.src.w + x];
      if (x === 0) g.moveTo(X(x), Y(v)); else g.lineTo(X(x), Y(v));
    }
    g.stroke();

    g.strokeStyle = '#3a76a8'; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < this.src.w; x++) {
      const v = gauss.data[row * this.src.w + x];
      if (x === 0) g.moveTo(X(x), Y(v)); else g.lineTo(X(x), Y(v));
    }
    g.stroke();

    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < this.src.w; x++) {
      const v = bil.data[row * this.src.w + x];
      if (x === 0) g.moveTo(X(x), Y(v)); else g.lineTo(X(x), Y(v));
    }
    g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Bilateral runs in O(σ_s²) per pixel without acceleration. Modern HDR pipelines use joint-bilateral or guided filters for real-time use.', M, h - M);
  }
}

new Bilateral();
