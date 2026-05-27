import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class BeatFrequency {
  private stage: CanvasStage;
  private f1 = 5.0;        // arbitrary "Hz" — visually mapped
  private f2 = 5.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.f1 = hydrateNumber('f1', 50) / 10;
    this.f2 = hydrateNumber('f2', 55) / 10;
    (document.getElementById('f1') as EncSlider).value = this.f1 * 10;
    (document.getElementById('f2') as EncSlider).value = this.f2 * 10;

    registerStateParam('f1', () => Math.round(this.f1 * 10));
    registerStateParam('f2', () => Math.round(this.f2 * 10));

    (document.getElementById('f1') as EncSlider).addEventListener('input', (e) => {
      this.f1 = (e.target as EncSlider).value / 10; this.draw(); notifyStateChange();
    });
    (document.getElementById('f2') as EncSlider).addEventListener('input', (e) => {
      this.f2 = (e.target as EncSlider).value / 10; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.f1 = 5.0; this.f2 = 5.5;
      (document.getElementById('f1') as EncSlider).value = 50;
      (document.getElementById('f2') as EncSlider).value = 55;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const rowH = h / 3;
    const rowY = [rowH * 0.5, rowH * 1.5, rowH * 2.5];

    // Three baselines + sum
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    for (const y of rowY) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const amp = Math.min(60, rowH * 0.35);
    const scale = 0.012;       // pixels-per-x to radians-per-cycle
    const drawWave = (cy: number, f: number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.7;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        const y = cy - amp * Math.sin(2 * Math.PI * f * x * scale);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawWave(rowY[0], this.f1, theme.inkAlpha(0.85));
    drawWave(rowY[1], this.f2, theme.slate);

    // Sum (halved amplitude so peak fits) + envelope at |f1 − f2|
    ctx.strokeStyle = theme.crimson;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const y = rowY[2] - 0.5 * amp *
        (Math.sin(2 * Math.PI * this.f1 * x * scale) + Math.sin(2 * Math.PI * this.f2 * x * scale));
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Envelope curves: ±|cos(π·Δf·t)|
    ctx.strokeStyle = theme.goldDeep;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const env = Math.abs(Math.cos(2 * Math.PI * 0.5 * (this.f1 - this.f2) * x * scale));
      const y = rowY[2] - amp * env;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const env = Math.abs(Math.cos(2 * Math.PI * 0.5 * (this.f1 - this.f2) * x * scale));
      const y = rowY[2] + amp * env;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels + readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`f₁ = ${this.f1.toFixed(1)} Hz`, 14, rowY[0] - 8);
    ctx.fillText(`f₂ = ${this.f2.toFixed(1)} Hz`, 14, rowY[1] - 8);
    const beat = Math.abs(this.f1 - this.f2);
    ctx.fillText(`sum, beat = ${beat.toFixed(2)} Hz`, 14, rowY[2] - 8);
  }
}

window.addEventListener('DOMContentLoaded', () => new BeatFrequency());
