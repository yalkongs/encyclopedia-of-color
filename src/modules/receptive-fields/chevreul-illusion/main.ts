import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { dogKernel, perceive } from '@core/math/receptive-field';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const LO = 0.18, HI = 0.86;

class Chevreul {
  private stage: CanvasStage;
  private steps = 8;
  private isolate: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.steps = hydrateNumber('steps', 8);
    this.isolate = (hydrateFromUrl('isolate') as 'off' | 'on') ?? 'off';
    (document.getElementById('steps') as EncSlider).value = this.steps;
    (document.getElementById('isolate') as EncToggle).value = this.isolate;
    registerStateParam('steps', () => this.steps);
    registerStateParam('isolate', () => this.isolate);
    (document.getElementById('steps') as EncSlider).addEventListener('input', (e) => {
      this.steps = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('isolate') as EncToggle).addEventListener('change', (e) => {
      this.isolate = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.steps = 8; this.isolate = 'off';
      (document.getElementById('steps') as EncSlider).value = 8;
      (document.getElementById('isolate') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private stepValue(i: number): number {
    return LO + (i / (this.steps - 1)) * (HI - LO);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 44;
    const plotX = pad, plotW = Math.max(10, w - pad * 1.4);
    const N = this.steps;
    const cellW = plotW / N;
    const gap = this.isolate === 'on' ? cellW * 0.32 : 0;

    // --- Staircase strip. ---
    const stripY = 46, stripH = h * 0.34;
    if (gap > 0) { ctx.fillStyle = `rgb(128,128,128)`; ctx.fillRect(plotX, stripY, plotW, stripH); }
    for (let i = 0; i < N; i++) {
      const g = Math.round(this.stepValue(i) * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(plotX + i * cellW + gap / 2, stripY, cellW - gap, stripH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(plotX, stripY, plotW, stripH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(this.isolate === 'on' ? 'isolated by neutral gaps — each band is flat' : 'bands abut — each looks scalloped', plotX, stripY - 8);

    // --- Actual vs perceived profile (always for the abutting case). ---
    const n = Math.round(plotW);
    const actual = new Float32Array(n);
    for (let i = 0; i < n; i++) actual[i] = this.stepValue(Math.min(N - 1, Math.floor((i / n) * N)));
    const kernel = dogKernel(1.4, 9, 28);
    const perceived = perceive(actual, kernel, 6);

    const py = stripY + stripH + 40, ph = h - py - 44;
    const lo = LO - 0.12, hi = HI + 0.12;
    const yOf = (v: number) => py + (1 - (v - lo) / (hi - lo)) * ph;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, py + ph); ctx.lineTo(plotX + n, py + ph); ctx.stroke();

    const curve = (data: ArrayLike<number>, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i < n; i++) { const X = plotX + i, Y = yOf(data[i]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke();
    };
    curve(actual, theme.slateAlpha(0.85), 1.6);
    curve(perceived, theme.crimson, 1.8);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.slate; ctx.fillText('— actual (flat steps)', plotX + 4, py + 14);
    ctx.fillStyle = theme.crimson; ctx.fillText('— perceived (scalloped)', plotX + 4, py + 30);
  }
}
window.addEventListener('DOMContentLoaded', () => new Chevreul());
