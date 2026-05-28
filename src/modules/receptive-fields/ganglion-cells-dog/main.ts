import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { dog } from '@core/math/receptive-field';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const EXC: [number, number, number] = [168, 50, 50];   // crimson — excitation
const INH: [number, number, number] = [74, 90, 107];   // slate — inhibition
const PAPER: [number, number, number] = [251, 246, 232];

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * Math.max(0, Math.min(1, t)));
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

class GanglionDoG {
  private stage: CanvasStage;
  private sigC = 5;
  private sigS = 13;
  private polarity: 'on' | 'off' = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sigC = hydrateNumber('sigC', 5);
    this.sigS = hydrateNumber('sigS', 13);
    this.polarity = (hydrateFromUrl('polarity') as 'on' | 'off') ?? 'on';
    (document.getElementById('sigC') as EncSlider).value = this.sigC;
    (document.getElementById('sigS') as EncSlider).value = this.sigS;
    (document.getElementById('polarity') as EncToggle).value = this.polarity;
    registerStateParam('sigC', () => this.sigC);
    registerStateParam('sigS', () => this.sigS);
    registerStateParam('polarity', () => this.polarity);
    for (const id of ['sigC', 'sigS'] as const) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value;
        if (this.sigS <= this.sigC) this.sigS = this.sigC + 1;
        this.draw(); notifyStateChange();
      });
    }
    (document.getElementById('polarity') as EncToggle).addEventListener('change', (e) => {
      this.polarity = (e as CustomEvent).detail.value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.sigC = 5; this.sigS = 13; this.polarity = 'on';
      (document.getElementById('sigC') as EncSlider).value = 5;
      (document.getElementById('sigS') as EncSlider).value = 13;
      (document.getElementById('polarity') as EncToggle).value = 'on';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const sign = this.polarity === 'on' ? 1 : -1;
    const Rmax = 2.6 * this.sigS;
    // Normalisation: scan radius for peak excitation and trough inhibition.
    let posMax = 1e-6, negMax = 1e-6;
    for (let r = 0; r <= Rmax; r += 0.5) {
      const v = dog(r, this.sigC, this.sigS);
      if (v > posMax) posMax = v;
      if (-v > negMax) negMax = -v;
    }

    const split = Math.floor(w * 0.5);
    this.drawField(ctx, 0, 0, split, h, sign, Rmax, posMax, negMax);
    this.drawProfile(ctx, split, 0, w - split, h, sign, Rmax, posMax, negMax);
  }

  private drawField(
    ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number,
    sign: number, Rmax: number, posMax: number, negMax: number,
  ) {
    const cx = x0 + w / 2, cy = y0 + h * 0.52;
    const Rpx = Math.min(w * 0.46, h * 0.42);
    const step = 2;
    for (let py = -Rpx; py <= Rpx; py += step) {
      for (let px = -Rpx; px <= Rpx; px += step) {
        const rpx = Math.hypot(px, py);
        if (rpx > Rpx) continue;
        const r = (rpx / Rpx) * Rmax;
        const v = sign * dog(r, this.sigC, this.sigS);
        ctx.fillStyle = v >= 0 ? mix(PAPER, EXC, v / posMax) : mix(PAPER, INH, -v / negMax);
        ctx.fillRect(cx + px, cy + py, step, step);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, Rpx, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('2-D receptive field', cx, y0 + h * 0.98);
    ctx.textAlign = 'left';
  }

  private drawProfile(
    ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number,
    sign: number, Rmax: number, posMax: number, negMax: number,
  ) {
    const pad = 34;
    const plotX = x0 + pad, plotW = w - pad * 1.4;
    const midY = y0 + h * 0.52, ampUp = h * 0.32, ampDn = h * 0.30;
    const xOf = (r: number) => plotX + ((r + Rmax) / (2 * Rmax)) * plotW;
    const yOf = (v: number) => v >= 0 ? midY - (v / posMax) * ampUp : midY + (-v / negMax) * ampDn;

    // Zero baseline + axis.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, midY); ctx.lineTo(plotX + plotW, midY); ctx.stroke();
    ctx.strokeStyle = theme.inkAlpha(0.2);
    ctx.beginPath(); ctx.moveTo(xOf(0), y0 + 30); ctx.lineTo(xOf(0), y0 + h - 40); ctx.stroke();

    // DoG cross-section.
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.8;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= plotW; px++) {
      const r = -Rmax + (px / plotW) * (2 * Rmax);
      const v = sign * dog(r, this.sigC, this.sigS);
      const X = plotX + px, Y = yOf(v);
      if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // Labels.
    ctx.fillStyle = theme.crimson; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(sign > 0 ? '+ excitation' : '+ excitation', plotX + 4, midY - ampUp + 4);
    ctx.fillStyle = theme.slate;
    ctx.fillText('− inhibition', plotX + 4, midY + ampDn - 2);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(
      `σ_c ${this.sigC.toFixed(1)}   σ_s ${this.sigS.toFixed(1)}   ${this.polarity}-centre`,
      plotX, y0 + h * 0.98,
    );
  }
}
window.addEventListener('DOMContentLoaded', () => new GanglionDoG());
