import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticTestImage, unsharpMask, drawImage } from '@core/math/convolution';

class Unsharp {
  private stage: CanvasStage;
  private sigma = 1.5;
  private alpha = 1;
  private src = syntheticTestImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sigma = hydrateNumber('sigma', 1.5);
    this.alpha = hydrateNumber('alpha', 1);
    const s1 = document.getElementById('sigma') as EncSlider; s1.value = this.sigma;
    const s2 = document.getElementById('alpha') as EncSlider; s2.value = this.alpha;
    s1.addEventListener('input', (e) => { this.sigma = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    s2.addEventListener('input', (e) => { this.alpha = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sigma', () => this.sigma.toFixed(1));
    registerStateParam('alpha', () => this.alpha.toFixed(2));
    document.addEventListener('reset-params', () => {
      this.sigma = 1.5; this.alpha = 1; s1.value = 1.5; s2.value = 1;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = unsharpMask(this.src, this.sigma, this.alpha);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`σ = ${this.sigma.toFixed(1)} px · α = ${this.alpha.toFixed(2)}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText(`sharpened (α=${this.alpha.toFixed(2)})`, M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, out, M + imgW + 30, M + 30, scale);

    // Profile through a vertical step (column 80 of src)
    const py = M + 30 + imgH + 40;
    const ph = 100, pw = w - 2 * M;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('horizontal profile through step edge (row 16) — overshoot = "halo"', M, py - 6);

    // Plot row 16
    const row = 16;
    const X = (x: number) => M + (x / this.src.w) * pw;
    const Y = (v: number) => py + (1 - v) * ph;
    // Original
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x < this.src.w; x++) {
      const v = this.src.data[row * this.src.w + x];
      if (x === 0) g.moveTo(X(x), Y(v)); else g.lineTo(X(x), Y(v));
    }
    g.stroke();
    // Sharpened
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < this.src.w; x++) {
      const v = out.data[row * this.src.w + x];
      if (x === 0) g.moveTo(X(x), Y(v)); else g.lineTo(X(x), Y(v));
    }
    g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'right';
    g.fillText('gray=original · red=sharpened', M + pw, py + ph + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Print and screen pipelines apply unsharp mask after every resize. Too much α produces visible "halo" rings around edges.', M, h - M);
  }
}

new Unsharp();
