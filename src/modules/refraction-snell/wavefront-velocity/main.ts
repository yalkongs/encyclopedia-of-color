import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class WavefrontVelocity {
  private stage: CanvasStage;
  private n2 = 1.5;
  private start = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n2 = hydrateNumber('n2', 1.5);
    (document.getElementById('n2') as EncSlider).value = this.n2;
    registerStateParam('n2', () => this.n2);
    (document.getElementById('n2') as EncSlider).addEventListener('input', (e) => {
      this.n2 = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.n2 = 1.5; (document.getElementById('n2') as EncSlider).value = 1.5; notifyStateChange();
    });
    this.start = performance.now();
    this.loop();
  }

  private loop = () => { this.draw(); requestAnimationFrame(this.loop); };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const boundary = w * 0.5;
    const t = (performance.now() - this.start) / 1000;
    const c = 200; // vacuum speed (px/s)
    const lambda0 = 80;
    const lambda1 = lambda0 / this.n2;

    // Medium tint
    ctx.fillStyle = theme.slateAlpha(0.08);
    ctx.fillRect(boundary, 0, w - boundary, h);
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(boundary, 0); ctx.lineTo(boundary, h); ctx.stroke();

    // Wavefronts as vertical lines
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    // Left side: wavefronts at x = (i + ε) · lambda0, moving right at c
    const shift = (c * t) % lambda0;
    for (let i = -2; i < 30; i++) {
      const x = -shift + i * lambda0;
      if (x < 0 || x > boundary) continue;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 30); ctx.stroke();
    }
    // Right side: wavefronts at boundary + j·lambda1, moving right at c/n2
    const shift2 = (c / this.n2 * t) % lambda1;
    for (let j = 0; j < 30; j++) {
      const x = boundary + ((-shift2) + j * lambda1);
      if (x < boundary || x > w) continue;
      ctx.strokeStyle = theme.slate;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 30); ctx.stroke();
    }

    // Calipers
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1;
    const calY = h - 60;
    ctx.beginPath();
    ctx.moveTo(40, calY); ctx.lineTo(40 + lambda0, calY);
    ctx.moveTo(40, calY - 5); ctx.lineTo(40, calY + 5);
    ctx.moveTo(40 + lambda0, calY - 5); ctx.lineTo(40 + lambda0, calY + 5);
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`λ = ${lambda0}`, 40 + lambda0 / 2 - 24, calY + 18);
    ctx.beginPath();
    ctx.moveTo(boundary + 20, calY); ctx.lineTo(boundary + 20 + lambda1, calY);
    ctx.moveTo(boundary + 20, calY - 5); ctx.lineTo(boundary + 20, calY + 5);
    ctx.moveTo(boundary + 20 + lambda1, calY - 5); ctx.lineTo(boundary + 20 + lambda1, calY + 5);
    ctx.stroke();
    ctx.fillText(`λ/n = ${lambda1.toFixed(0)}`, boundary + 20 + lambda1 / 2 - 28, calY + 18);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`n₁ = 1.00   v₁ = c       λ₁ = ${lambda0}`, 16, 30);
    ctx.fillStyle = theme.slate;
    ctx.fillText(`n₂ = ${this.n2.toFixed(2)}   v₂ = c/n   λ₂ = ${lambda1.toFixed(0)}`, 16, 52);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('frequency unchanged across the boundary', 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new WavefrontVelocity());
