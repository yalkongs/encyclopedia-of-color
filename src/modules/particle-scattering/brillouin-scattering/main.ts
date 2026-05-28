import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LASER_NM = 532;

class Brillouin {
  private stage: CanvasStage;
  private vs = 1500;   // m/s
  private theta = 90;  // deg
  private n = 1.33;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.vs = hydrateNumber('vs', 1500);
    this.theta = hydrateNumber('theta', 90);
    this.n = hydrateNumber('n', 1.33);
    (document.getElementById('vs') as EncSlider).value = this.vs;
    (document.getElementById('theta') as EncSlider).value = this.theta;
    (document.getElementById('n') as EncSlider).value = this.n;
    registerStateParam('vs', () => this.vs);
    registerStateParam('theta', () => this.theta);
    registerStateParam('n', () => this.n);
    for (const id of ['vs', 'theta', 'n']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'vs') this.vs = v;
        else if (id === 'theta') this.theta = v;
        else this.n = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.vs = 1500; this.theta = 90; this.n = 1.33;
      (document.getElementById('vs') as EncSlider).value = 1500;
      (document.getElementById('theta') as EncSlider).value = 90;
      (document.getElementById('n') as EncSlider).value = 1.33;
      this.draw(); notifyStateChange();
    });
  }

  // Brillouin shift in Hz.
  private shiftHz(): number {
    const lambda = LASER_NM * 1e-9;
    return (2 * this.n * this.vs / lambda) * Math.sin((this.theta * DEG) / 2);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const df = this.shiftHz() / 1e9; // GHz
    const pad = 50;
    const plotX = pad + 6, plotY = pad - 6, plotW = w - pad * 2, plotH = h - pad * 2.4;
    const maxGHz = 15;
    const xOf = (f: number) => plotX + ((f + maxGHz) / (2 * maxGHz)) * plotW;
    const yOf = (I: number) => plotY + (1 - I) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Lorentzian helper.
    const gamma = 0.6; // GHz linewidth
    const lor = (f: number, f0: number, amp: number) => amp / (1 + ((f - f0) / gamma) ** 2);

    // Build spectrum: central Rayleigh + two Brillouin lines.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.9;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const f = -maxGHz + (2 * maxGHz) * (i / 600);
      const I = Math.min(1, lor(f, 0, 1.0) + lor(f, +df, 0.4) + lor(f, -df, 0.4));
      const px = xOf(f), py = yOf(I);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Doublet markers.
    ctx.strokeStyle = theme.goldAlpha(0.7); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    for (const f0 of [df, -df]) {
      if (Math.abs(f0) <= maxGHz) { ctx.beginPath(); ctx.moveTo(xOf(f0), plotY); ctx.lineTo(xOf(f0), plotY + plotH); ctx.stroke(); }
    }
    ctx.setLineDash([]);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Rayleigh', xOf(0) - 22, plotY + 10);
    if (df <= maxGHz) { ctx.fillText('Stokes', xOf(-df) - 16, plotY + 24); ctx.fillText('anti-Stokes', xOf(df) - 24, plotY + 24); }

    // X ticks.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let f = -15; f <= 15; f += 5) ctx.fillText(`${f}`, xOf(f) - 8, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('frequency shift (GHz)', plotX + plotW * 0.36, plotY + plotH + 28);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`vₛ = ${this.vs} m/s   θ = ${this.theta}°   n = ${this.n.toFixed(2)}`, plotX + 4, plotY + 6);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`Brillouin shift Δf = ±${df.toFixed(2)} GHz`, plotX + 4, plotY + 26);
  }
}
window.addEventListener('DOMContentLoaded', () => new Brillouin());
