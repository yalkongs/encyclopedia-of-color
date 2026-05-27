import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { snellRefract, criticalAngle, DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class CriticalAngleModule {
  private stage: CanvasStage;
  private theta1Deg = 35;
  private n1 = 1.50;
  private n2 = 1.00;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.theta1Deg = hydrateNumber('theta', 35);
    this.n1 = hydrateNumber('n1', 1.5);
    this.n2 = hydrateNumber('n2', 1.0);
    (document.getElementById('theta') as EncSlider).value = this.theta1Deg;
    (document.getElementById('n1') as EncSlider).value = this.n1;
    (document.getElementById('n2') as EncSlider).value = this.n2;

    registerStateParam('theta', () => this.theta1Deg);
    registerStateParam('n1', () => this.n1);
    registerStateParam('n2', () => this.n2);

    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.theta1Deg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n1') as EncSlider).addEventListener('input', (e) => {
      this.n1 = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n2') as EncSlider).addEventListener('input', (e) => {
      this.n2 = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    (document.getElementById('theta') as EncSlider).value = 35;
    (document.getElementById('n1') as EncSlider).value = 1.5;
    (document.getElementById('n2') as EncSlider).value = 1.0;
    this.theta1Deg = 35; this.n1 = 1.5; this.n2 = 1.0;
    this.draw(); notifyStateChange();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    // Lower (denser) medium tint
    ctx.fillStyle = theme.slateAlpha(0.07);
    ctx.fillRect(0, cy, w, h - cy);
    // Boundary
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    // Normal
    ctx.setLineDash([4, 4]); ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.setLineDash([]);

    const t1 = this.theta1Deg * DEG;
    const tc = criticalAngle(this.n1, this.n2);
    const t2 = snellRefract(this.n1, this.n2, t1);
    const isTIR = t2 === null;

    const rayLen = Math.min(w, h) * 0.42;

    // Incident from below (we treat lower medium as the dense one in this module)
    const ix = cx - Math.sin(t1) * rayLen;
    const iy = cy + Math.cos(t1) * rayLen;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();

    if (isTIR) {
      // All light reflects back into dense medium — crimson
      ctx.strokeStyle = theme.crimson;
      const rx = cx + Math.sin(t1) * rayLen;
      const ry = cy + Math.cos(t1) * rayLen;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rx, ry); ctx.stroke();
    } else {
      // Refracted into rare medium (above)
      ctx.strokeStyle = theme.slate;
      const tx = cx + Math.sin(t2!) * rayLen;
      const ty = cy - Math.cos(t2!) * rayLen;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      // Faint partial reflection
      ctx.strokeStyle = theme.inkAlpha(0.25);
      ctx.lineWidth = 1;
      const rx = cx + Math.sin(t1) * rayLen;
      const ry = cy + Math.cos(t1) * rayLen;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rx, ry); ctx.stroke();
    }

    // Critical-angle dial mark on boundary
    if (tc !== null) {
      ctx.strokeStyle = theme.goldDeep;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      const tcx = cx - Math.sin(tc) * rayLen;
      const tcy = cy + Math.cos(tc) * rayLen;
      ctx.moveTo(cx, cy); ctx.lineTo(tcx, tcy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ₁ = ${this.theta1Deg.toFixed(1)}°`, 16, 30);
    ctx.fillText(`n₁ = ${this.n1.toFixed(2)}  (dense, lower)`, 16, h - 60);
    ctx.fillText(`n₂ = ${this.n2.toFixed(2)}  (rare, upper)`, 16, h - 40);
    ctx.fillText(`θ_c = ${tc === null ? '—' : (tc * RAD).toFixed(2) + '°'}`, 16, h - 20);
    ctx.fillStyle = isTIR ? theme.crimson : theme.slate;
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText(isTIR ? 'TOTAL INTERNAL REFLECTION' : `θ₂ = ${(t2! * RAD).toFixed(2)}°`, w - 280, 30);
  }
}

window.addEventListener('DOMContentLoaded', () => new CriticalAngleModule());
