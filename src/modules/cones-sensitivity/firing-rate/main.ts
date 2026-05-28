import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const HILL = 1;            // Naka-Rushton exponent n
const X_MIN = -2, X_MAX = 5; // log10 intensity axis

function nakaRushton(I: number, sigma: number): number {
  const In = Math.pow(I, HILL);
  return In / (In + Math.pow(sigma, HILL));
}

class FiringRate {
  private stage: CanvasStage;
  private logI = 1.5;
  private logSig = 1.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.logI = hydrateNumber('logI', 1.5);
    this.logSig = hydrateNumber('logSig', 1.5);
    for (const id of ['logI', 'logSig'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.logI = 1.5; this.logSig = 1.5;
      (document.getElementById('logI') as EncSlider).value = 1.5;
      (document.getElementById('logSig') as EncSlider).value = 1.5;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 52, padR = 28, padT = 40, padB = 60;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (lx: number) => plotX + ((lx - X_MIN) / (X_MAX - X_MIN)) * plotW;
    const yOf = (R: number) => plotY + (1 - R) * plotH;

    const sigma = Math.pow(10, this.logSig);

    // Axes + grid.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let lx = X_MIN; lx <= X_MAX; lx++) {
      const x = xOf(lx);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
      ctx.fillStyle = axisStyle.label; ctx.fillText(`10${supScript(lx)}`, x, plotY + plotH + 16);
    }
    ctx.fillText('light intensity I  (log scale)', plotX + plotW / 2, plotY + plotH + 34);
    // Y labels.
    ctx.textAlign = 'right';
    for (let r = 0; r <= 1; r += 0.5) {
      ctx.fillStyle = axisStyle.label; ctx.fillText(r.toFixed(1), plotX - 8, yOf(r) + 3);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(plotX, yOf(r)); ctx.lineTo(plotX + plotW, yOf(r)); ctx.stroke();
    }
    ctx.save(); ctx.translate(plotX - 36, plotY + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = theme.inkMute; ctx.textAlign = 'center'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('R / R_max', 0, 0); ctx.restore();
    ctx.textAlign = 'left';

    // Curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const lx = X_MIN + (i / plotW) * (X_MAX - X_MIN);
      const R = nakaRushton(Math.pow(10, lx), sigma);
      const px = plotX + i, py = yOf(R);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Semi-saturation marker (R = 0.5 at I = σ).
    ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(this.logSig), plotY + plotH); ctx.lineTo(xOf(this.logSig), yOf(0.5)); ctx.lineTo(plotX, yOf(0.5)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('σ (half-max)', xOf(this.logSig) + 4, yOf(0.5) - 6);

    // Operating point.
    const R = nakaRushton(Math.pow(10, this.logI), sigma);
    const opx = xOf(this.logI), opy = yOf(R);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(opx, plotY + plotH); ctx.lineTo(opx, opy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(opx, opy, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`I = 10${supScript(this.logI)}    R/R_max = ${R.toFixed(3)}`, plotX, plotY - 16);
  }
}

function supScript(x: number): string {
  const s = (Math.round(x * 100) / 100).toString();
  const map: Record<string, string> = { '-': '⁻', '.': '·', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return [...s].map((c) => map[c] ?? c).join('');
}

window.addEventListener('DOMContentLoaded', () => new FiringRate());
