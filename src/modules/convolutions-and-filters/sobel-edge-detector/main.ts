import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticTestImage, convolve2D, sobelX, sobelY, sobelMagnitude, drawImage, ImageF32 } from '@core/math/convolution';

class Sobel {
  private stage: CanvasStage;
  private m = 3;
  private src = syntheticTestImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.m = hydrateNumber('m', 3);
    const s = document.getElementById('m') as EncSlider; s.value = this.m;
    s.addEventListener('input', (e) => { this.m = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('m', () => Math.round(this.m));
    document.addEventListener('reset-params', () => { this.m = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const gx = convolve2D(this.src, sobelX().kernel, 3);
    const gy = convolve2D(this.src, sobelY().kernel, 3);
    const mag = sobelMagnitude(this.src);

    let out: ImageF32, label: string;
    if (this.m === 1) { out = gx; label = 'Gx (∂I/∂x)'; }
    else if (this.m === 2) { out = gy; label = 'Gy (∂I/∂y)'; }
    else { out = mag; label = '|∇I| magnitude'; }

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Sobel ${label}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText(label, M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, out, M + imgW + 30, M + 30, scale, { abs: this.m !== 3, gain: this.m === 3 ? 1.5 : 1.5 });

    // Kernels
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Sobel kernels', M, ky);
    const cell = 28;
    const labels = [
      { name: 'Gx', vals: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
      { name: 'Gy', vals: [-1, -2, -1, 0, 0, 0, 1, 2, 1] },
    ];
    for (let i = 0; i < 2; i++) {
      const baseX = M + i * (3 * cell + 30);
      const baseY = ky + 18;
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
        const v = labels[i].vals[yy * 3 + xx];
        g.fillStyle = v > 0 ? '#d3f0d3' : v < 0 ? '#f0d3d3' : '#f0f0f0';
        g.fillRect(baseX + xx * cell, baseY + yy * cell, cell - 1, cell - 1);
        g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
        g.fillText(String(v), baseX + xx * cell + cell / 2, baseY + yy * cell + cell / 2 + 4);
      }
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(baseX, baseY, 3 * cell, 3 * cell);
      g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'left';
      g.fillText(labels[i].name, baseX, baseY - 6);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('green = +, red = −, gray = 0; 1-2-1 weighting gives built-in smoothing.', M + 2 * (3 * cell + 30) + 10, ky + 30);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Magnitude |∇I| = √(Gx²+Gy²) gives orientation-invariant edge strength. Used as the seed in Canny edge detection.', M, h - M);
  }
}

new Sobel();
