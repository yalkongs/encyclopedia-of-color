import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TAU = 6;          // regeneration time constant (min)
const T_MAX = 40;       // axis max (min)
const K_DOWLING = 4;    // log threshold elevation per unit bleached fraction

class RhodopsinKinetics {
  private stage: CanvasStage;
  private bleach = 100;  // %
  private t = 0;         // min

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bleach = hydrateNumber('bleach', 100);
    this.t = hydrateNumber('t', 0);
    for (const id of ['bleach', 't'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.bleach = 100; this.t = 0;
      (document.getElementById('bleach') as EncSlider).value = 100;
      (document.getElementById('t') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private unbleached(t: number): number {
    return 1 - (this.bleach / 100) * Math.exp(-t / TAU);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 52, padR = 52, padT = 40, padB = 56;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (t: number) => plotX + (t / T_MAX) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH; // v in 0..1

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let t = 0; t <= T_MAX; t += 10) {
      const x = xOf(t);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
      ctx.fillStyle = axisStyle.label; ctx.fillText(String(t), x, plotY + plotH + 16);
    }
    ctx.fillText('time in darkness (min)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.textAlign = 'left';

    // Left axis: unbleached fraction.
    ctx.fillStyle = theme.crimson; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('unbleached p', plotX - 6, plotY - 14);
    ctx.fillStyle = theme.slate; ctx.textAlign = 'right';
    ctx.fillText('Δlog threshold', plotX + plotW + 46, plotY - 14);
    ctx.textAlign = 'left';

    // Unbleached fraction curve (crimson).
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const t = (i / plotW) * T_MAX;
      const px = plotX + i, py = yOf(this.unbleached(t));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Threshold elevation curve (slate, dashed) — Δlog = K·(1-p), normalised by K.
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const t = (i / plotW) * T_MAX;
      const elevNorm = (1 - this.unbleached(t)); // 0..1 (×K = log units)
      const px = plotX + i, py = yOf(elevNorm);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Current-time marker.
    const p = this.unbleached(this.t);
    const elev = K_DOWLING * (1 - p);
    const mx = xOf(this.t);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, plotY); ctx.lineTo(mx, plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson; ctx.beginPath(); ctx.arc(mx, yOf(p), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = theme.slate; ctx.beginPath(); ctx.arc(mx, yOf(1 - p), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.stroke();

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`t = ${this.t.toFixed(1)} min    p = ${(p * 100).toFixed(0)}%    Δlog T = +${elev.toFixed(2)}`, plotX, h - 10);
  }
}
window.addEventListener('DOMContentLoaded', () => new RhodopsinKinetics());
