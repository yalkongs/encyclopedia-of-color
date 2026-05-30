import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticTestImage, gaussianKernel, convolve2D, drawImage } from '@core/math/convolution';

class GaussianBlur {
  private stage: CanvasStage;
  private sigma = 1.5;
  private src = syntheticTestImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sigma = hydrateNumber('sigma', 1.5);
    const s = document.getElementById('sigma') as EncSlider; s.value = this.sigma;
    s.addEventListener('input', (e) => { this.sigma = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sigma', () => this.sigma.toFixed(1));
    document.addEventListener('reset-params', () => { this.sigma = 1.5; s.value = 1.5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const { kernel, size } = gaussianKernel(this.sigma);
    const blurred = convolve2D(this.src, kernel, size);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`σ = ${this.sigma.toFixed(1)} px · kernel = ${size}×${size}`, M, M);

    // Left: original
    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    // Right: blurred
    const rx = M + imgW + 40;
    g.fillText(`Gaussian σ=${this.sigma.toFixed(1)}`, rx + imgW / 2, M + 26);
    drawImage(g, blurred, rx, M + 30, scale);

    // Kernel visualisation (below)
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('kernel coefficients (greyscale, large = brighter)', M, ky);
    const ks = Math.min(size, 21);
    const cell = 16;
    const kw = ks * cell;
    let maxV = 0;
    for (let i = 0; i < kernel.length; i++) if (kernel[i] > maxV) maxV = kernel[i];
    for (let yy = 0; yy < ks; yy++) for (let xx = 0; xx < ks; xx++) {
      const v = kernel[yy * size + xx] / maxV;
      const ch = Math.round(v * 255);
      g.fillStyle = `rgb(${ch},${ch},${ch})`;
      g.fillRect(M + xx * cell, ky + 10 + yy * cell, cell - 1, cell - 1);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, ky + 10, kw, ks * cell);

    // 1D profile (centre row)
    const px = M + kw + 30, py = ky + 10;
    const ph = ks * cell, pw = w - M - px - 10;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('central column profile', px + pw / 2, py - 4);
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let xx = 0; xx < ks; xx++) {
      const v = kernel[Math.floor(size / 2) * size + xx] / maxV;
      const x0 = px + (xx / (ks - 1)) * pw, y0 = py + (1 - v) * ph;
      if (xx === 0) g.moveTo(x0, y0); else g.lineTo(x0, y0);
    }
    g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Gaussian is separable: 1D × 1D pass costs O(σ) per pixel instead of O(σ²) — the standard low-pass for vision pipelines.', M, h - M);
  }
}

new GaussianBlur();
