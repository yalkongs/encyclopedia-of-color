import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SoundVsLight {
  private stage: CanvasStage;
  private ratio = 0.10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ratio = hydrateNumber('ratio', 0.10);
    (document.getElementById('ratio') as EncSlider).value = this.ratio;
    registerStateParam('ratio', () => this.ratio);
    (document.getElementById('ratio') as EncSlider).addEventListener('input', (e) => {
      this.ratio = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.ratio = 0.10;
      (document.getElementById('ratio') as EncSlider).value = 0.10;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const slitX = w * 0.30;
    const cy = h * 0.5;
    const apertureHalf = Math.min(h * 0.30, 18 + (1 / Math.max(this.ratio, 0.02)) * 2.2);
    // Spread angle θ = asin(min(ratio,1)).
    const theta = Math.asin(Math.min(this.ratio, 1));

    // Incoming plane wave (left).
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1;
    for (let x = 14; x < slitX - 10; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, cy - h * 0.34); ctx.lineTo(x, cy + h * 0.34); ctx.stroke();
    }

    // Barrier with aperture.
    ctx.fillStyle = theme.inkAlpha(0.55);
    ctx.fillRect(slitX - 3, 0, 6, cy - apertureHalf);
    ctx.fillRect(slitX - 3, cy + apertureHalf, 6, h - (cy + apertureHalf));

    // Diffracted wavefronts: arcs from the aperture, limited to ±θ.
    ctx.strokeStyle = theme.crimsonAlpha(0.55); ctx.lineWidth = 1.2;
    const maxR = w - slitX - 20;
    for (let rr = 30; rr < maxR; rr += 28) {
      ctx.beginPath(); ctx.arc(slitX, cy, rr, -theta, theta); ctx.stroke();
    }

    // Cone edges (dashed gold).
    ctx.strokeStyle = theme.goldAlpha(0.6); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(slitX, cy); ctx.lineTo(slitX + Math.cos(theta) * maxR, cy - Math.sin(theta) * maxR);
    ctx.moveTo(slitX, cy); ctx.lineTo(slitX + Math.cos(theta) * maxR, cy + Math.sin(theta) * maxR);
    ctx.stroke(); ctx.setLineDash([]);

    // Aperture caliper.
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(slitX + 10, cy - apertureHalf); ctx.lineTo(slitX + 10, cy + apertureHalf); ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('a', slitX + 14, cy + 4);

    // Regime label.
    let regime = 'light through a window';
    if (this.ratio > 0.6) regime = 'sound around a doorway';
    else if (this.ratio > 0.2) regime = 'intermediate spreading';

    // Readouts.
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`λ / a = ${this.ratio.toFixed(2)}`, 16, 30);
    ctx.fillText(`spread half-angle θ ≈ ${(theta * RAD).toFixed(1)}°`, 16, 52);
    ctx.fillStyle = theme.crimson;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(regime, 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new SoundVsLight());
