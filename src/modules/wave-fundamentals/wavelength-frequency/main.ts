import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Animation: wave travels at constant speed c. User picks wavelength;
 * frequency f = c/λ is computed and shown. A reference clock ticks at f.
 */
class WavelengthFrequency {
  private stage: CanvasStage;
  private lambda = 200;
  private readonly c = 300;     // px/sec
  private startTime = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.lambda = hydrateNumber('lambda', 200);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('lambda', () => this.lambda);

    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.lambda = 200;
      (document.getElementById('lambda') as EncSlider).value = 200;
      notifyStateChange();
    });

    this.startTime = performance.now();
    this.loop();
  }

  private loop = () => {
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.4;
    const amp = Math.min(70, h * 0.22);
    const t = (performance.now() - this.startTime) / 1000;

    // Wave travels: y = A sin(2π(x − c·t)/λ)
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const y = cy - amp * Math.sin((2 * Math.PI * (x - this.c * t)) / this.lambda);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Wavelength caliper between two crests
    const crestX1 = 80;
    const crestX2 = crestX1 + this.lambda;
    const calY = cy + amp + 22;
    ctx.strokeStyle = theme.goldDeep;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(crestX1, calY); ctx.lineTo(crestX2, calY);
    ctx.moveTo(crestX1, calY - 5); ctx.lineTo(crestX1, calY + 5);
    ctx.moveTo(crestX2, calY - 5); ctx.lineTo(crestX2, calY + 5);
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('λ', (crestX1 + crestX2) / 2 - 5, calY + 18);

    // Reference clock — pulses at frequency f
    const f = this.c / this.lambda;
    const period = 1 / f;
    const phase = (t % period) / period;
    const clockX = w * 0.7;
    const clockY = h * 0.78;
    const clockR = Math.min(60, h * 0.12);
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.arc(clockX, clockY, clockR, 0, Math.PI * 2); ctx.stroke();
    // Sweeping hand
    const handAng = phase * 2 * Math.PI - Math.PI / 2;
    ctx.strokeStyle = theme.crimson;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(clockX, clockY);
    ctx.lineTo(clockX + Math.cos(handAng) * clockR * 0.85, clockY + Math.sin(handAng) * clockR * 0.85);
    ctx.stroke();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(clockX, clockY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`one tick = 1/f`, clockX - 30, clockY + clockR + 18);

    // Readout
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`λ = ${this.lambda} px`, 16, 30);
    ctx.fillText(`c = ${this.c} px/s  (fixed)`, 16, 52);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`f = c/λ = ${f.toFixed(2)} Hz`, 16, 74);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('long λ → low f          short λ → high f', 16, 96);
  }
}

window.addEventListener('DOMContentLoaded', () => new WavelengthFrequency());
