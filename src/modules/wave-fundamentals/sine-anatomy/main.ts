import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { DEG } from '@core/math/color-science';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SineAnatomy {
  private stage: CanvasStage;
  private amp = 60;
  private lambda = 200;
  private phaseDeg = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.amp = hydrateNumber('amp', 60);
    this.lambda = hydrateNumber('lambda', 200);
    this.phaseDeg = hydrateNumber('phase', 0);
    (document.getElementById('amp') as EncSlider).value = this.amp;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('phase') as EncSlider).value = this.phaseDeg;

    registerStateParam('amp', () => this.amp);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('phase', () => this.phaseDeg);

    this.bindSlider('amp', (v) => (this.amp = v));
    this.bindSlider('lambda', (v) => (this.lambda = v));
    this.bindSlider('phase', (v) => (this.phaseDeg = v));

    document.addEventListener('reset-params', () => this.reset());
  }

  private bindSlider(id: string, set: (v: number) => void) {
    const el = document.getElementById(id) as EncSlider;
    el.addEventListener('input', () => {
      set(el.value);
      this.draw();
      notifyStateChange();
    });
    set(el.value);
  }

  private reset() {
    (document.getElementById('amp') as EncSlider).value = 60;
    (document.getElementById('lambda') as EncSlider).value = 200;
    (document.getElementById('phase') as EncSlider).value = 0;
    this.amp = 60; this.lambda = 200; this.phaseDeg = 0;
    this.draw();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h / 2;
    const phase = this.phaseDeg * DEG;

    // Baseline (horizontal axis)
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Vertical reference (origin marker at left)
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, h);
    ctx.stroke();

    // Amplitude rails (dashed)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath();
    ctx.moveTo(0, cy - this.amp); ctx.lineTo(w, cy - this.amp);
    ctx.moveTo(0, cy + this.amp); ctx.lineTo(w, cy + this.amp);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sine curve — deep ink
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const y = cy - this.amp * Math.sin((2 * Math.PI * x) / this.lambda + phase);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Parameter readouts — gold serif annotations
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`A = ${this.amp} px`, 12, 20);
    ctx.fillText(`λ = ${this.lambda} px`, 12, 38);
    ctx.fillText(`ϕ = ${this.phaseDeg}°`, 12, 56);

    // Wavelength caliper — gold
    const startX = 80;
    const calY = cy + this.amp + 24;
    ctx.strokeStyle = axisStyle.caliper;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, calY);
    ctx.lineTo(startX + this.lambda, calY);
    ctx.moveTo(startX, calY - 5); ctx.lineTo(startX, calY + 5);
    ctx.moveTo(startX + this.lambda, calY - 5); ctx.lineTo(startX + this.lambda, calY + 5);
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('λ', startX + this.lambda / 2 - 5, calY + 18);

    // Amplitude caliper
    const ampX = w - 30;
    ctx.strokeStyle = axisStyle.caliper;
    ctx.beginPath();
    ctx.moveTo(ampX, cy); ctx.lineTo(ampX, cy - this.amp);
    ctx.moveTo(ampX - 5, cy); ctx.lineTo(ampX + 5, cy);
    ctx.moveTo(ampX - 5, cy - this.amp); ctx.lineTo(ampX + 5, cy - this.amp);
    ctx.stroke();
    ctx.fillText('A', ampX + 8, cy - this.amp / 2 + 4);
  }
}

window.addEventListener('DOMContentLoaded', () => new SineAnatomy());
