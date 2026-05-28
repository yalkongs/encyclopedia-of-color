import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { dogKernel, perceive } from '@core/math/receptive-field';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const SIG_C = 1.5;
const GAIN = 7;
const RAMP0 = 0.34, RAMP1 = 0.66; // ramp occupies the middle third

class MachBands {
  private stage: CanvasStage;
  private contrast = 0.6;
  private sigS = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.contrast = hydrateNumber('contrast', 0.6);
    this.sigS = hydrateNumber('sigS', 10);
    for (const id of ['contrast', 'sigS'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.contrast = 0.6; this.sigS = 10;
      (document.getElementById('contrast') as EncSlider).value = 0.6;
      (document.getElementById('sigS') as EncSlider).value = 10;
      this.draw(); notifyStateChange();
    });
  }

  private profile(n: number): Float32Array {
    const lo = 0.5 - this.contrast / 2, hi = 0.5 + this.contrast / 2;
    const p = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      if (t < RAMP0) p[i] = lo;
      else if (t > RAMP1) p[i] = hi;
      else p[i] = lo + ((t - RAMP0) / (RAMP1 - RAMP0)) * (hi - lo);
    }
    return p;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 44;
    const plotX = pad, plotW = Math.max(10, w - pad * 1.4);
    const n = Math.round(plotW);
    const actual = this.profile(n);
    const kernel = dogKernel(SIG_C, this.sigS, Math.ceil(3 * this.sigS));
    const perceived = perceive(actual, kernel, GAIN);

    // --- Grey strip (the physical stimulus). ---
    const stripY = 46, stripH = h * 0.30;
    for (let i = 0; i < n; i++) {
      const g = Math.round(Math.max(0, Math.min(1, actual[i])) * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(plotX + i, stripY, 1, stripH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(plotX, stripY, n, stripH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('physical luminance (uniform plateaus + a ramp)', plotX, stripY - 8);

    // --- Profile plot. ---
    const py = stripY + stripH + 44, ph = h - py - 46;
    const lo = -0.08, hi = 1.18;
    const xOf = (i: number) => plotX + i;
    const yOf = (v: number) => py + (1 - (v - lo) / (hi - lo)) * ph;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, yOf(0)); ctx.lineTo(plotX + n, yOf(0)); ctx.stroke();

    // Ramp-knee guides — where Mach bands sit.
    for (const t of [RAMP0, RAMP1]) {
      const x = xOf(Math.round(t * (n - 1)));
      ctx.strokeStyle = theme.goldAlpha(0.6); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke(); ctx.setLineDash([]);
    }

    const curve = (data: ArrayLike<number>, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i < n; i++) { const X = xOf(i), Y = yOf(data[i]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke();
    };
    curve(actual, theme.slateAlpha(0.85), 1.6);
    curve(perceived, theme.crimson, 1.8);

    // Legend + readout.
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.slate; ctx.fillText('— actual luminance', plotX + 4, py + 14);
    ctx.fillStyle = theme.crimson; ctx.fillText('— perceived (with Mach overshoot)', plotX + 4, py + 30);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`contrast ${this.contrast.toFixed(2)}    σ_s ${this.sigS.toFixed(1)}`, plotX, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MachBands());
