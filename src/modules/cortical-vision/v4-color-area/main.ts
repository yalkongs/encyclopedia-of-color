import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const PREF = [0, 60, 120, 180, 240, 300];
const SIGMA = 42;

function wrapDelta(a: number, b: number): number {
  let d = ((a - b + 180) % 360 + 360) % 360 - 180;
  return d;
}
function tuning(stim: number, pref: number): number {
  const d = wrapDelta(stim, pref);
  return Math.exp(-((d / SIGMA) ** 2));
}

class V4Color {
  private stage: CanvasStage;
  private hue = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 40);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => this.hue);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 40;
      (document.getElementById('hue') as EncSlider).value = 40;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 48, padR = 28, padT = 40, padB = 64;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (hue: number) => plotX + (hue / 360) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;

    // Hue wash baseline.
    for (let px = 0; px < plotW; px++) {
      const hue = (px / plotW) * 360;
      ctx.fillStyle = `hsl(${hue}, 75%, 50%)`;
      ctx.fillRect(plotX + px, plotY + plotH + 4, 1, 9);
    }
    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let hh = 0; hh <= 360; hh += 60) ctx.fillText(`${hh}°`, xOf(hh), plotY + plotH + 28);
    ctx.fillText('stimulus hue', plotX + plotW / 2, plotY + plotH + 44);
    ctx.textAlign = 'left';

    // Tuning curves.
    for (const pref of PREF) {
      ctx.strokeStyle = `hsl(${pref}, 70%, 42%)`; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let px = 0; px <= plotW; px++) {
        const hue = (px / plotW) * 360;
        const X = plotX + px, Y = yOf(tuning(hue, pref));
        px === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.stroke();
    }

    // Stimulus marker + per-cell response dots.
    const mx = xOf(this.hue);
    ctx.strokeStyle = theme.inkAlpha(0.55); ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, plotY); ctx.lineTo(mx, plotY + plotH); ctx.stroke(); ctx.setLineDash([]);
    let best = PREF[0], bestR = 0;
    for (const pref of PREF) {
      const r = tuning(this.hue, pref);
      if (r > bestR) { bestR = r; best = pref; }
      ctx.fillStyle = `hsl(${pref}, 70%, 42%)`;
      ctx.beginPath(); ctx.arc(mx, yOf(r), 4, 0, 2 * Math.PI); ctx.fill();
    }

    // Stimulus swatch + readout.
    ctx.fillStyle = `hsl(${this.hue}, 75%, 50%)`;
    ctx.fillRect(plotX, plotY - 4, 26, 20);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(plotX, plotY - 4, 26, 20);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`hue ${this.hue}°  →  cell tuned to ${best}° fires hardest (${(bestR * 100).toFixed(0)}%)`, plotX + 34, plotY + 11);
  }
}
window.addEventListener('DOMContentLoaded', () => new V4Color());
