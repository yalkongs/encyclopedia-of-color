import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PhaseShifter {
  private stage: CanvasStage;
  private phaseDeg = 90;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.phaseDeg = hydrateNumber('phi', 90);
    (document.getElementById('phi') as EncSlider).value = this.phaseDeg;
    registerStateParam('phi', () => this.phaseDeg);

    (document.getElementById('phi') as EncSlider).addEventListener('input', (e) => {
      this.phaseDeg = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.phaseDeg = 90;
      (document.getElementById('phi') as EncSlider).value = 90;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const phi = this.phaseDeg * DEG;
    const lambda = 220;
    const amp = Math.min(70, h * 0.22);
    const waveY = h * 0.45;
    const circleR = Math.min(80, h * 0.16);
    const circleX = w - circleR - 60;
    const circleY = h * 0.78;

    // Reference baseline + amplitude rails
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, waveY); ctx.lineTo(w, waveY); ctx.stroke();

    // Reference sine (faint)
    ctx.strokeStyle = theme.inkAlpha(0.25);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const y = waveY - amp * Math.sin((2 * Math.PI * x) / lambda);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Shifted sine
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const y = waveY - amp * Math.sin((2 * Math.PI * x) / lambda + phi);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Sample point at x=80 on both waves
    const xSample = 80;
    const yRef = waveY - amp * Math.sin((2 * Math.PI * xSample) / lambda);
    const yShift = waveY - amp * Math.sin((2 * Math.PI * xSample) / lambda + phi);
    ctx.fillStyle = theme.inkAlpha(0.5);
    ctx.beginPath(); ctx.arc(xSample, yRef, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(xSample, yShift, 5, 0, Math.PI * 2); ctx.fill();

    // Unit circle (right side)
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2); ctx.stroke();
    // Axes
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath();
    ctx.moveTo(circleX - circleR, circleY); ctx.lineTo(circleX + circleR, circleY);
    ctx.moveTo(circleX, circleY - circleR); ctx.lineTo(circleX, circleY + circleR);
    ctx.stroke();
    // Phasor arm at angle φ (measured from +x, going counter-clockwise but canvas y is inverted)
    const tipX = circleX + circleR * Math.cos(phi);
    const tipY = circleY - circleR * Math.sin(phi);
    ctx.strokeStyle = theme.crimson;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(circleX, circleY); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(tipX, tipY, 5, 0, Math.PI * 2); ctx.fill();
    // φ arc
    ctx.strokeStyle = theme.goldDeep;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(circleX, circleY, 22, 0, -phi, true);
    ctx.stroke();

    // Labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = axisStyle.label;
    ctx.fillText('reference  (φ = 0)', 14, waveY - amp - 8);
    ctx.fillText(`shifted  (φ = ${this.phaseDeg}°)`, 14, waveY + amp + 18);
    ctx.fillText('phasor', circleX - 20, circleY - circleR - 12);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`φ = ${this.phaseDeg.toFixed(0)}°  =  ${(this.phaseDeg / 360).toFixed(3)} λ  shift`, 16, 30);
    ctx.fillText(`cos φ = ${Math.cos(phi).toFixed(3)}   sin φ = ${Math.sin(phi).toFixed(3)}`, 16, 52);
  }
}

window.addEventListener('DOMContentLoaded', () => new PhaseShifter());
