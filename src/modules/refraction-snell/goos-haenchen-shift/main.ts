import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { criticalAngle, DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class GoosHaenchen {
  private stage: CanvasStage;
  private thetaDeg = 45;
  private readonly n1 = 1.5;
  private readonly n2 = 1.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 45);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    registerStateParam('theta', () => this.thetaDeg);
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.thetaDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 45; (document.getElementById('theta') as EncSlider).value = 45;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.55;
    const cx = w * 0.5;
    const tC = criticalAngle(this.n1, this.n2)!;
    const tCDeg = tC * RAD;

    // Dense medium (below)
    ctx.fillStyle = theme.slateAlpha(0.08);
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.setLineDash([]);

    const t1 = this.thetaDeg * DEG;
    const len = Math.min(w, h) * 0.34;

    if (this.thetaDeg < tCDeg) {
      // Below critical — normal refraction (no shift)
      const ix = cx - Math.sin(t1) * len, iy = cy + Math.cos(t1) * len;
      const rx = cx + Math.sin(t1) * len, ry = cy + Math.cos(t1) * len;
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = theme.inkAlpha(0.35);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rx, ry); ctx.stroke();
      // Refracted ray (simplified — direction approximate)
      ctx.fillStyle = theme.crimson;
      ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('below critical — no GH shift', 16, cy - 12);
    } else {
      // TIR with Goos-Hänchen shift
      // Shift magnitude (qualitative): grows as we approach θ_c from above
      const sinTc = Math.sin(tC);
      const sinT = Math.sin(t1);
      const denom = Math.sqrt(Math.max(1e-5, sinT * sinT - sinTc * sinTc));
      const shift = Math.min(100, 5 / denom * (this.n1 / Math.PI));   // empirical
      const dShift = shift * 8;

      // Incident
      const ix = cx - Math.sin(t1) * len, iy = cy + Math.cos(t1) * len;
      // Reflected emerges at displaced point
      const cxShift = cx + dShift;
      const rx = cxShift + Math.sin(t1) * len, ry = cy + Math.cos(t1) * len;

      ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();
      // Reference reflection (no-shift, dashed)
      ctx.strokeStyle = theme.crimsonAlpha(0.4);
      ctx.setLineDash([3, 4]);
      const refRx = cx + Math.sin(t1) * len, refRy = cy + Math.cos(t1) * len;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(refRx, refRy); ctx.stroke();
      ctx.setLineDash([]);
      // Actual shifted reflection
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cxShift, cy); ctx.lineTo(rx, ry); ctx.stroke();
      // Surface tail along boundary (evanescent visualisation)
      ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cxShift, cy); ctx.stroke();
      ctx.fillStyle = theme.goldDeep;
      ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`D = ${dShift.toFixed(1)} px`, cx + 6, cy - 8);
    }

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ = ${this.thetaDeg}°    θ_c = ${tCDeg.toFixed(1)}°`, 16, 30);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Shift diverges as θ → θ_c⁺ (textbook approximation)', 16, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new GoosHaenchen());
