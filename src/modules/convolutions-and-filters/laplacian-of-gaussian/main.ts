import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticTestImage, logKernel, convolve2D, drawImage } from '@core/math/convolution';

class LoG {
  private stage: CanvasStage;
  private sigma = 2;
  private src = syntheticTestImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sigma = hydrateNumber('sigma', 2);
    const s = document.getElementById('sigma') as EncSlider; s.value = this.sigma;
    s.addEventListener('input', (e) => { this.sigma = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sigma', () => this.sigma.toFixed(1));
    document.addEventListener('reset-params', () => { this.sigma = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const { kernel, size } = logKernel(this.sigma);
    const out = convolve2D(this.src, kernel, size);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`LoG σ = ${this.sigma.toFixed(1)} · kernel = ${size}×${size} · blob radius ≈ σ√2 ≈ ${(this.sigma * Math.SQRT2).toFixed(1)} px`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText('LoG response |∇²G ∗ I|', M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, out, M + imgW + 30, M + 30, scale, { abs: true, gain: 2 });

    // Kernel grid
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('LoG kernel (Mexican hat: + centre, − ring)', M, ky);
    const cell = 14;
    let maxAbs = 0;
    for (let i = 0; i < kernel.length; i++) if (Math.abs(kernel[i]) > maxAbs) maxAbs = Math.abs(kernel[i]);
    for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
      const v = kernel[yy * size + xx] / maxAbs;
      if (v > 0) g.fillStyle = `rgba(80,170,80,${Math.abs(v)})`;
      else g.fillStyle = `rgba(180,60,60,${Math.abs(v)})`;
      g.fillRect(M + xx * cell, ky + 10 + yy * cell, cell - 1, cell - 1);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, ky + 10, size * cell, size * cell);

    // 1D radial profile
    const px = M + size * cell + 30, py = ky + 10;
    const ph = size * cell, pw = w - M - px - 10;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('radial profile (centre row)', px + pw / 2, py - 4);
    // 0 line
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(px, py + ph / 2); g.lineTo(px + pw, py + ph / 2); g.stroke(); g.setLineDash([]);
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let xx = 0; xx < size; xx++) {
      const v = kernel[Math.floor(size / 2) * size + xx] / maxAbs;
      const x0 = px + (xx / (size - 1)) * pw, y0 = py + (1 - (v + 1) / 2) * ph;
      if (xx === 0) g.moveTo(x0, y0); else g.lineTo(x0, y0);
    }
    g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Zero-crossings of LoG mark edges; local maxima of |LoG| mark blobs — foundation of SIFT/SURF feature detection.', M, h - M);
  }
}

new LoG();
