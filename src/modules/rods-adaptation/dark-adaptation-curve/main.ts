import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const T_MAX = 30;
const Y_HI = 4.5, Y_LO = -3.5; // log threshold axis (high = insensitive, on top)

// Biphasic log-threshold model (teaching fit; rod-cone break ≈ 8 min).
function coneThreshold(t: number): number { return -0.4 + 3.0 * Math.exp(-t / 1.6); }
function rodThreshold(t: number): number { return -3.2 + 7.6 * Math.exp(-t / 8.0); }
function envelope(t: number): number { return Math.min(coneThreshold(t), rodThreshold(t)); }

/** Time where rod branch first drops below the cone branch. */
function findBreak(): number {
  for (let t = 0; t <= T_MAX; t += 0.05) if (rodThreshold(t) <= coneThreshold(t)) return t;
  return T_MAX;
}

class DarkAdaptation {
  private stage: CanvasStage;
  private t = 0;
  private tBreak = findBreak();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 0);
    (document.getElementById('t') as EncSlider).value = this.t;
    registerStateParam('t', () => this.t);
    (document.getElementById('t') as EncSlider).addEventListener('input', (e) => {
      this.t = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.t = 0;
      (document.getElementById('t') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 54, padR = 28, padT = 40, padB = 56;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (t: number) => plotX + (t / T_MAX) * plotW;
    const yOf = (v: number) => plotY + ((Y_HI - v) / (Y_HI - Y_LO)) * plotH;

    // Axes + grid.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let t = 0; t <= T_MAX; t += 5) {
      const x = xOf(t);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
      ctx.fillStyle = axisStyle.label; ctx.fillText(String(t), x, plotY + plotH + 16);
    }
    ctx.fillText('time in the dark (min)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.textAlign = 'right';
    for (let v = -3; v <= 4; v += 1) {
      ctx.fillStyle = axisStyle.label; ctx.fillText(String(v), plotX - 8, yOf(v) + 3);
    }
    ctx.save(); ctx.translate(plotX - 38, plotY + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = theme.inkMute; ctx.textAlign = 'center'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('log threshold  (less sensitive ↑)', 0, 0); ctx.restore();
    ctx.textAlign = 'left';

    // Faint branches.
    const branch = (f: (t: number) => number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let i = 0; i <= plotW; i++) {
        const t = (i / plotW) * T_MAX;
        const px = plotX + i, py = yOf(f(t));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    branch(coneThreshold, theme.goldAlpha(0.7));
    branch(rodThreshold, theme.slateAlpha(0.7));

    // Bold envelope.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const t = (i / plotW) * T_MAX;
      const px = plotX + i, py = yOf(envelope(t));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Branch labels.
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = theme.goldDeep; ctx.fillText('cones', xOf(2.2), yOf(coneThreshold(2.2)) - 8);
    ctx.fillStyle = theme.slate; ctx.fillText('rods', xOf(20), yOf(rodThreshold(20)) - 8);

    // Rod-cone break.
    const bx = xOf(this.tBreak), by = yOf(envelope(this.tBreak));
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`rod-cone break · ${this.tBreak.toFixed(1)} min`, bx + 8, by - 6);

    // Current-time marker.
    const v = envelope(this.t);
    const mx = xOf(this.t);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, plotY); ctx.lineTo(mx, plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson; ctx.beginPath(); ctx.arc(mx, yOf(v), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();

    // Readout.
    const phase = this.t < this.tBreak ? 'cone-limited' : 'rod-limited';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`t = ${this.t.toFixed(1)} min    log threshold = ${v.toFixed(2)}    (${phase})`, plotX, plotY - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new DarkAdaptation());
