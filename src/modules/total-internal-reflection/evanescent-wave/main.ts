import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { criticalAngle, evanescentDecayDepth, DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class EvanescentWave {
  private stage: CanvasStage;
  private thetaDeg = 50;
  private nDense = 1.5;
  private lambdaNm = 550;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 50);
    this.nDense = hydrateNumber('n', 1.5);
    this.lambdaNm = hydrateNumber('lambda', 550);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    (document.getElementById('n') as EncSlider).value = this.nDense;
    (document.getElementById('lambda') as EncSlider).value = this.lambdaNm;
    registerStateParam('theta', () => this.thetaDeg);
    registerStateParam('n', () => this.nDense);
    registerStateParam('lambda', () => this.lambdaNm);
    for (const id of ['theta', 'n', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'theta') this.thetaDeg = v;
        else if (id === 'n') this.nDense = v;
        else this.lambdaNm = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 50; this.nDense = 1.5; this.lambdaNm = 550;
      (document.getElementById('theta') as EncSlider).value = 50;
      (document.getElementById('n') as EncSlider).value = 1.5;
      (document.getElementById('lambda') as EncSlider).value = 550;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.4;
    const interfaceY = cy + 80;
    const tC = criticalAngle(this.nDense, 1.0);
    const tCDeg = tC === null ? Infinity : tC * RAD;
    const t = this.thetaDeg * DEG;
    const dp = evanescentDecayDepth(this.lambdaNm, this.nDense, 1.0, t);  // nm

    // Dense medium (top tinted), rare (bottom)
    ctx.fillStyle = theme.slateAlpha(0.08);
    ctx.fillRect(0, 0, w, interfaceY);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, interfaceY); ctx.lineTo(w, interfaceY); ctx.stroke();

    // TIR ray inside dense medium
    const cx = w * 0.4;
    const len = 130;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    const ix = cx - Math.sin(t) * len, iy = interfaceY - Math.cos(t) * len;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, interfaceY); ctx.stroke();

    if (dp === null) {
      // Not in TIR — light refracts normally
      ctx.fillStyle = theme.inkMute;
      ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`θ = ${this.thetaDeg}° < θ_c = ${tCDeg.toFixed(1)}° — no TIR, no evanescent wave`, 16, 30);
      // Refracted ray
      const t2 = Math.asin(this.nDense * Math.sin(t));
      const rx = cx + Math.sin(t2) * len;
      const ry = interfaceY + Math.cos(t2) * len;
      ctx.strokeStyle = theme.slate;
      ctx.beginPath(); ctx.moveTo(cx, interfaceY); ctx.lineTo(rx, ry); ctx.stroke();
      return;
    }
    // Reflected ray (TIR)
    const rx = cx + Math.sin(t) * len;
    const ry = interfaceY - Math.cos(t) * len;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, interfaceY); ctx.lineTo(rx, ry); ctx.stroke();

    // Evanescent field visualisation: vertical exponential decay below interface
    // Scale dp (nm) to pixels: dp_px = dp / λ (nm) × pxPerWavelength
    const pxPerLambda = 30;  // visual scale
    const dpPx = (dp / this.lambdaNm) * pxPerLambda * 5;   // empirical zoom
    const decayWidth = w - 80;
    for (let zPx = 0; zPx < (h - interfaceY); zPx += 1) {
      const amp = Math.exp(-zPx / Math.max(0.5, dpPx));
      const a = amp * 0.55;
      ctx.fillStyle = `rgba(184, 146, 76, ${a})`;
      ctx.fillRect(40, interfaceY + zPx, decayWidth, 1);
    }

    // d_p annotation line
    ctx.strokeStyle = theme.crimson;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, interfaceY + dpPx); ctx.lineTo(w - 40, interfaceY + dpPx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`d_p (1/e)`, w - 100, interfaceY + dpPx - 4);

    // Decay plot — right side
    const plotX0 = w - 200, plotY0 = h - 40, plotH = 140, plotW = 160;
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath();
    ctx.moveTo(plotX0, plotY0); ctx.lineTo(plotX0 + plotW, plotY0);
    ctx.moveTo(plotX0, plotY0); ctx.lineTo(plotX0, plotY0 - plotH);
    ctx.stroke();
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const x = plotX0 + i;
      const a = Math.exp(-i / Math.max(0.5, dpPx));
      ctx.lineTo(x, plotY0 - a * plotH);
    }
    ctx.stroke();
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('|E|(z)', plotX0 - 18, plotY0 - plotH + 4);
    ctx.fillText('z', plotX0 + plotW + 4, plotY0 + 4);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ = ${this.thetaDeg}°    θ_c = ${tCDeg.toFixed(2)}°`, 16, 30);
    ctx.fillText(`n_dense = ${this.nDense.toFixed(2)}    λ = ${this.lambdaNm} nm`, 16, 52);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`d_p = ${dp.toFixed(1)} nm  (≈ λ/4 typical at TIR)`, 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new EvanescentWave());
