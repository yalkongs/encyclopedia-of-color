import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Superposition {
  private stage: CanvasStage;
  private phaseDeg = 60;
  private amp = 50;
  private lambda = 220;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.phaseDeg = hydrateNumber('phi', 60);
    this.amp = hydrateNumber('A', 50);
    this.lambda = hydrateNumber('lambda', 220);
    (document.getElementById('phi') as EncSlider).value = this.phaseDeg;
    (document.getElementById('A') as EncSlider).value = this.amp;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;

    registerStateParam('phi', () => this.phaseDeg);
    registerStateParam('A', () => this.amp);
    registerStateParam('lambda', () => this.lambda);

    (document.getElementById('phi') as EncSlider).addEventListener('input', (e) => {
      this.phaseDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('A') as EncSlider).addEventListener('input', (e) => {
      this.amp = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    (document.getElementById('phi') as EncSlider).value = 60;
    (document.getElementById('A') as EncSlider).value = 50;
    (document.getElementById('lambda') as EncSlider).value = 220;
    this.phaseDeg = 60; this.amp = 50; this.lambda = 220;
    this.draw(); notifyStateChange();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const xPad = 50;
    const phi = this.phaseDeg * DEG;
    const k = (2 * Math.PI) / this.lambda;

    // Three baselines stacked
    const rowH = h / 3;
    const baselines = [rowH * 0.5, rowH * 1.5, rowH * 2.5];

    // Wave A (top)
    this.drawBaseline(ctx, baselines[0], w, 'wave A');
    this.drawWave(ctx, baselines[0], w, xPad, (x) => Math.sin(k * x), theme.inkAlpha(0.85));

    // Wave B (middle, phase-shifted)
    this.drawBaseline(ctx, baselines[1], w, `wave B  (Δφ = ${this.phaseDeg}°)`);
    this.drawWave(ctx, baselines[1], w, xPad, (x) => Math.sin(k * x + phi), theme.slate);

    // Sum (bottom)
    const peakAtPhi = 2 * Math.abs(Math.cos(phi / 2));
    this.drawBaseline(ctx, baselines[2], w, `sum (peak = ${peakAtPhi.toFixed(2)})`);
    this.drawWave(
      ctx, baselines[2], w, xPad,
      (x) => Math.sin(k * x) + Math.sin(k * x + phi),
      theme.crimson,
      0.5,  // amplitude halved so the doubled peak still fits
    );
  }

  private drawBaseline(ctx: CanvasRenderingContext2D, y: number, w: number, label: string) {
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(label, 14, y - 8);
  }

  private drawWave(
    ctx: CanvasRenderingContext2D,
    cy: number,
    w: number,
    xPad: number,
    fn: (x: number) => number,
    color: string,
    ampScale = 1,
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let xp = 0; xp <= w; xp++) {
      const x = xp - xPad;
      const y = cy - this.amp * ampScale * fn(x);
      if (xp === 0) ctx.moveTo(xp, y);
      else ctx.lineTo(xp, y);
    }
    ctx.stroke();
  }
}

window.addEventListener('DOMContentLoaded', () => new Superposition());
