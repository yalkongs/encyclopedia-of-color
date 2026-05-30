import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticTestImage, boxKernel, gaussianKernel, convolve2D, drawImage } from '@core/math/convolution';

class BoxFilter {
  private stage: CanvasStage;
  private k = 5;
  private src = syntheticTestImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.k = hydrateNumber('k', 5);
    if (this.k % 2 === 0) this.k += 1;
    const s = document.getElementById('k') as EncSlider; s.value = this.k;
    s.addEventListener('input', (e) => {
      let v = (e as CustomEvent).detail.value as number;
      if (v % 2 === 0) v += 1;
      this.k = v; this.draw(); notifyStateChange();
    });
    registerStateParam('k', () => Math.round(this.k));
    document.addEventListener('reset-params', () => { this.k = 5; s.value = 5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const box = boxKernel(this.k);
    const boxed = convolve2D(this.src, box, this.k);
    // For comparison: Gaussian of similar σ (k = 2*ceil(3σ)+1 → σ ≈ (k-1)/6)
    const sigma = (this.k - 1) / 6 + 0.5;
    const { kernel, size } = gaussianKernel(sigma, this.k);
    const gauss = convolve2D(this.src, kernel, size);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`box k=${this.k} vs Gaussian σ≈${sigma.toFixed(2)} (same kernel size)`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText(`box k=${this.k}`, M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, boxed, M + imgW + 30, M + 30, scale);

    g.fillText(`Gaussian σ≈${sigma.toFixed(2)}`, M + 2 * (imgW + 30) + imgW / 2, M + 26);
    drawImage(g, gauss, M + 2 * (imgW + 30), M + 30, scale);

    // Kernel grid for box
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('box kernel (uniform 1/k² everywhere)', M, ky);
    const cell = 16;
    for (let yy = 0; yy < this.k; yy++) for (let xx = 0; xx < this.k; xx++) {
      g.fillStyle = `rgb(180,180,180)`;
      g.fillRect(M + xx * cell, ky + 10 + yy * cell, cell - 1, cell - 1);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, ky + 10, this.k * cell, this.k * cell);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Box filter has high-frequency leakage: notice the slight ringing at sharp step edges that Gaussian smooths out.', M, h - M);
  }
}

new BoxFilter();
