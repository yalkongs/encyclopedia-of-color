import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawImage } from '@core/math/convolution';
import { blueNoiseMask, blueNoiseDither, bayerOrdered, gradientImage } from '@core/math/dither';

class BlueNoise {
  private stage: CanvasStage;
  private l = 2;
  private src = gradientImage();
  private maskSize = 32;
  private mask = blueNoiseMask(32, 7);

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.l = hydrateNumber('l', 2);
    const s = document.getElementById('l') as EncSlider; s.value = this.l;
    s.addEventListener('input', (e) => { this.l = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('l', () => Math.round(this.l));
    document.addEventListener('reset-params', () => { this.l = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const blue = blueNoiseDither(this.src, this.l, this.mask, this.maskSize);
    const bay = bayerOrdered(this.src, this.l, 4);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Blue-noise (void-and-cluster mask 32²) vs Bayer 4×4 · levels = ${this.l}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original gradient', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText(`Bayer 4×4 (low-freq pattern)`, M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, bay, M + imgW + 30, M + 30, scale);

    g.fillText(`blue noise (high-freq pattern)`, M + 2 * (imgW + 30) + imgW / 2, M + 26);
    drawImage(g, blue, M + 2 * (imgW + 30), M + 30, scale);

    // Mask preview
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('blue-noise mask (32×32, tiles seamlessly)', M, ky);
    const cell = 8;
    for (let yy = 0; yy < this.maskSize; yy++) for (let xx = 0; xx < this.maskSize; xx++) {
      const v = this.mask[yy * this.maskSize + xx];
      const ch = Math.round(v * 255);
      g.fillStyle = `rgb(${ch},${ch},${ch})`;
      g.fillRect(M + xx * cell, ky + 10 + yy * cell, cell, cell);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, ky + 10, this.maskSize * cell, this.maskSize * cell);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Eyes integrate low frequencies → blue noise hides under the spatial-frequency response. Best dither for stills and SSAO.', M, h - M);
  }
}

new BlueNoise();
