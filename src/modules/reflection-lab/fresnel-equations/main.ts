import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Polarisation-resolved Fresnel reflectance (s and p) for air → medium of index n.
 *   r_s = (cos θ_i - n cos θ_t) / (cos θ_i + n cos θ_t)
 *   r_p = (n cos θ_i - cos θ_t) / (n cos θ_i + cos θ_t)
 */
function fresnelRs(thetaRad: number, n1: number, n2: number): number {
  const c1 = Math.cos(thetaRad);
  const s2 = (n1 / n2) * Math.sin(thetaRad);
  if (Math.abs(s2) > 1) return 1;
  const c2 = Math.sqrt(1 - s2 * s2);
  const r = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
  return r * r;
}
function fresnelRp(thetaRad: number, n1: number, n2: number): number {
  const c1 = Math.cos(thetaRad);
  const s2 = (n1 / n2) * Math.sin(thetaRad);
  if (Math.abs(s2) > 1) return 1;
  const c2 = Math.sqrt(1 - s2 * s2);
  const r = (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2);
  return r * r;
}

class FresnelEquations {
  private stage: CanvasStage;
  private thetaDeg = 56;
  private n2 = 1.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 56);
    this.n2 = hydrateNumber('n2', 1.5);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    (document.getElementById('n2') as EncSlider).value = this.n2;
    registerStateParam('theta', () => this.thetaDeg);
    registerStateParam('n2', () => this.n2);
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.thetaDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n2') as EncSlider).addEventListener('input', (e) => {
      this.n2 = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 56; this.n2 = 1.5;
      (document.getElementById('theta') as EncSlider).value = 56;
      (document.getElementById('n2') as EncSlider).value = 1.5;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 60, padR = 40, padT = 40, padB = 60;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const x0 = padL, y0 = h - padB, x1 = padL + plotW, y1 = padT;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
    ctx.stroke();

    // Ticks
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    for (let t = 0; t <= 90; t += 15) {
      const x = x0 + (t / 90) * plotW;
      ctx.strokeStyle = axisStyle.gridMajor;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 4); ctx.stroke();
      ctx.fillText(`${t}°`, x - 10, y0 + 18);
    }
    for (let r = 0; r <= 1; r += 0.25) {
      const y = y0 - r * plotH;
      ctx.strokeStyle = axisStyle.grid;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(r.toFixed(2), x0 - 30, y + 4);
    }
    ctx.fillText('θ_incident', x1 - 50, y0 + 38);
    ctx.fillText('R', x0 - 24, y1 - 6);

    // Curves
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.ink;       // s
    ctx.beginPath();
    for (let t = 0; t <= 90; t += 0.5) {
      const x = x0 + (t / 90) * plotW;
      const y = y0 - fresnelRs(t * DEG, 1, this.n2) * plotH;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = theme.crimson;   // p
    ctx.beginPath();
    for (let t = 0; t <= 90; t += 0.5) {
      const x = x0 + (t / 90) * plotW;
      const y = y0 - fresnelRp(t * DEG, 1, this.n2) * plotH;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Probe
    const probeX = x0 + (this.thetaDeg / 90) * plotW;
    const rs = fresnelRs(this.thetaDeg * DEG, 1, this.n2);
    const rp = fresnelRp(this.thetaDeg * DEG, 1, this.n2);
    ctx.strokeStyle = theme.goldDeep; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(probeX, y0); ctx.lineTo(probeX, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(probeX, y0 - rs * plotH, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(probeX, y0 - rp * plotH, 5, 0, Math.PI * 2); ctx.fill();

    // Brewster mark
    const thetaB = Math.atan(this.n2) / DEG;
    const tBx = x0 + (thetaB / 90) * plotW;
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tBx, y0 - 6); ctx.lineTo(tBx, y0 + 6);
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`θ_B = ${thetaB.toFixed(1)}°`, tBx + 4, y0 - 6);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.ink;
    ctx.fillText(`R_s = ${rs.toFixed(3)}`, 16, 28);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`R_p = ${rp.toFixed(3)}`, 16, 50);
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ = ${this.thetaDeg}°   n₂ = ${this.n2.toFixed(2)}`, 16, 72);
  }
}
window.addEventListener('DOMContentLoaded', () => new FresnelEquations());
