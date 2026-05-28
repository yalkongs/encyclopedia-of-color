import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SpatialFrequency {
  private stage: CanvasStage;
  private harmonics = 3;
  private freq = 4;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.harmonics = hydrateNumber('harmonics', 3);
    this.freq = hydrateNumber('freq', 4);
    (document.getElementById('harmonics') as EncSlider).value = this.harmonics;
    (document.getElementById('freq') as EncSlider).value = this.freq;
    registerStateParam('harmonics', () => this.harmonics);
    registerStateParam('freq', () => this.freq);
    for (const id of ['harmonics', 'freq']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'harmonics') this.harmonics = Math.round(v); else this.freq = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.harmonics = 3; this.freq = 4;
      (document.getElementById('harmonics') as EncSlider).value = 3;
      (document.getElementById('freq') as EncSlider).value = 4;
      this.draw(); notifyStateChange();
    });
  }

  // Partial Fourier square wave (odd harmonics).
  private value(x: number): number {
    let s = 0;
    for (let k = 1; k <= this.harmonics; k += 2) {
      s += (4 / (Math.PI * k)) * Math.sin(2 * Math.PI * k * this.freq * x);
    }
    return s;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const stripX = w * 0.08, stripW = w * 0.84, stripY = h * 0.13, stripH = h * 0.20;
    // Reconstructed image strip (grayscale).
    for (let px = 0; px < stripW; px++) {
      const x = px / stripW;
      const v = this.value(x);
      const g = Math.round(255 * (0.5 + 0.5 * Math.max(-1, Math.min(1, v))));
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(stripX + px, stripY, 1, stripH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.2;
    ctx.strokeRect(stripX, stripY, stripW, stripH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('reconstructed image', stripX, stripY - 8);

    // Waveform plot.
    const plotX = stripX, plotY = h * 0.42, plotW = stripW, plotH = h * 0.26;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH / 2); ctx.lineTo(plotX + plotW, plotY + plotH / 2); ctx.stroke();
    // Ideal square (faint).
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let px = 0; px <= plotW; px++) {
      const x = px / plotW;
      const sq = Math.sign(Math.sin(2 * Math.PI * this.freq * x)) || 1;
      const py = plotY + plotH / 2 - sq * plotH * 0.4;
      if (px === 0) ctx.moveTo(plotX + px, py); else ctx.lineTo(plotX + px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);
    // Partial sum (crimson).
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.9;
    ctx.beginPath();
    for (let px = 0; px <= plotW; px++) {
      const x = px / plotW;
      const py = plotY + plotH / 2 - this.value(x) * plotH * 0.4;
      if (px === 0) ctx.moveTo(plotX + px, py); else ctx.lineTo(plotX + px, py);
    }
    ctx.stroke();

    // Spectrum bars (amplitude of each odd harmonic).
    const specY = h * 0.74, specH = h * 0.16, specX = stripX;
    const nBars = 13;
    const barW = stripW / (nBars * 2);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    let included = 0;
    for (let i = 0; i < nBars; i++) {
      const k = 2 * i + 1; // odd harmonic
      const amp = (4 / (Math.PI * k));
      const on = k <= this.harmonics;
      if (on) included++;
      const bx = specX + i * (barW * 2) + barW * 0.5;
      const bh = amp * specH * 1.6;
      ctx.fillStyle = on ? theme.goldDeep : theme.inkAlpha(0.18);
      ctx.fillRect(bx, specY + specH - bh, barW, bh);
    }
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('spatial-frequency amplitudes (odd harmonics)', specX, specY + specH + 16);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`base ν₀ = ${this.freq} cycles   harmonics ≤ ${this.harmonics}  (${included} terms)`, stripX, h * 0.40);
  }
}
window.addEventListener('DOMContentLoaded', () => new SpatialFrequency());
