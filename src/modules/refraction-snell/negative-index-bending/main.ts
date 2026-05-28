import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class NegativeIndex {
  private stage: CanvasStage;
  private thetaDeg = 40;
  private n2 = -1.5;        // negative for metamaterial

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 40);
    this.n2 = hydrateNumber('n2', -150) / 100;
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    (document.getElementById('n2') as EncSlider).value = this.n2 * 100;
    registerStateParam('theta', () => this.thetaDeg);
    registerStateParam('n2', () => Math.round(this.n2 * 100));
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.thetaDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n2') as EncSlider).addEventListener('input', (e) => {
      this.n2 = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 40; this.n2 = -1.5;
      (document.getElementById('theta') as EncSlider).value = 40;
      (document.getElementById('n2') as EncSlider).value = -150;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    // Boundary + tinted lower
    const negative = this.n2 < 0;
    ctx.fillStyle = negative ? theme.crimsonAlpha(0.06) : theme.slateAlpha(0.08);
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.setLineDash([]);

    const t1 = this.thetaDeg * DEG;
    // Snell: sin θ₂ = (n₁/n₂) sin θ₁. Negative n₂ → negative sin θ₂ → ray emerges on the SAME side as incident, not opposite.
    const sinT2 = Math.sin(t1) / this.n2;   // can be negative
    const sgn = Math.sign(sinT2) || 1;
    const t2 = Math.asin(Math.min(1, Math.max(-1, Math.abs(sinT2)))) * sgn;
    const len = Math.min(w, h) * 0.4;
    const ix = cx - Math.sin(t1) * len, iy = cy - Math.cos(t1) * len;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();
    // Refracted ray — direction depends on sign
    const tx = cx + Math.sin(t2) * len;
    const ty = cy + Math.cos(t2) * len;
    ctx.strokeStyle = negative ? theme.crimson : theme.slate;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();

    // Labels + readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`n₁ = 1.00`, 16, cy - 12);
    ctx.fillText(`n₂ = ${this.n2.toFixed(2)}${negative ? '  (metamaterial)' : ''}`, 16, cy + 22);
    ctx.fillStyle = negative ? theme.crimson : theme.slate;
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText(negative ? 'NEGATIVE REFRACTION — ray on same side of normal' : 'NORMAL REFRACTION — ray on opposite side',
                 16, 28);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`θ₁ = ${this.thetaDeg}°    θ₂ = ${(t2 * RAD).toFixed(1)}°`, 16, 50);
  }
}
window.addEventListener('DOMContentLoaded', () => new NegativeIndex());
