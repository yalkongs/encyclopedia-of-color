import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class TransverseLongitudinal {
  private stage: CanvasStage;
  private freq = 1.5;
  private startTime = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.freq = hydrateNumber('f', 15) / 10;
    (document.getElementById('f') as EncSlider).value = this.freq * 10;
    registerStateParam('f', () => Math.round(this.freq * 10));

    (document.getElementById('f') as EncSlider).addEventListener('input', (e) => {
      this.freq = (e.target as EncSlider).value / 10; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.freq = 1.5;
      (document.getElementById('f') as EncSlider).value = 15;
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

    const t = (performance.now() - this.startTime) / 1000;
    const omega = 2 * Math.PI * this.freq;
    const k = 0.04;
    const yTop = h * 0.28;
    const yBot = h * 0.7;

    // -------- TRANSVERSE (top) — beads on a string, displaced perpendicular --------
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('transverse — string', 16, yTop - 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('displacement ⊥ direction of travel', 16, yTop - 30);

    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(40, yTop); ctx.lineTo(w - 40, yTop); ctx.stroke();

    const beadCount = 36;
    const left = 60, right = w - 60;
    for (let i = 0; i < beadCount; i++) {
      const x0 = left + (right - left) * (i / (beadCount - 1));
      const disp = 22 * Math.sin(k * x0 - omega * t);
      ctx.fillStyle = theme.ink;
      ctx.beginPath(); ctx.arc(x0, yTop + disp, 4, 0, Math.PI * 2); ctx.fill();
    }
    // String line connecting beads
    ctx.strokeStyle = theme.inkAlpha(0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = left; x <= right; x++) {
      const y = yTop + 22 * Math.sin(k * x - omega * t);
      if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // -------- LONGITUDINAL (bottom) — beads on a spring, displaced along axis --------
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('longitudinal — spring', 16, yBot - 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('displacement ∥ direction of travel', 16, yBot - 30);

    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(40, yBot); ctx.lineTo(w - 40, yBot); ctx.stroke();

    for (let i = 0; i < beadCount; i++) {
      const x0 = left + (right - left) * (i / (beadCount - 1));
      // Along-axis displacement
      const disp = 14 * Math.sin(k * x0 - omega * t);
      const colorAlpha = 0.5 + 0.5 * Math.cos(k * x0 - omega * t);  // density visualisation
      ctx.fillStyle = `rgba(26, 26, 46, ${colorAlpha})`;
      ctx.beginPath(); ctx.arc(x0 + disp, yBot, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Direction arrow shared by both panels
    ctx.strokeStyle = theme.goldDeep;
    ctx.lineWidth = 2;
    const arrY = h - 30;
    ctx.beginPath();
    ctx.moveTo(left, arrY); ctx.lineTo(right, arrY);
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath();
    ctx.moveTo(right, arrY); ctx.lineTo(right - 8, arrY - 4); ctx.lineTo(right - 8, arrY + 4);
    ctx.closePath(); ctx.fill();
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('direction of wave travel →', (left + right) / 2 - 80, arrY - 6);

    // Readout
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`f = ${this.freq.toFixed(1)} Hz`, w - 130, 30);
  }
}

window.addEventListener('DOMContentLoaded', () => new TransverseLongitudinal());
