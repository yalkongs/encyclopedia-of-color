import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { visualAcuity } from '@core/render/eye';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class FoveaPeriphery {
  private stage: CanvasStage;
  private ecc = 12;
  private freq = 8;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ecc = hydrateNumber('ecc', 12);
    this.freq = hydrateNumber('freq', 8);
    (document.getElementById('ecc') as EncSlider).value = this.ecc;
    (document.getElementById('freq') as EncSlider).value = this.freq;
    registerStateParam('ecc', () => this.ecc);
    registerStateParam('freq', () => this.freq);
    for (const id of ['ecc', 'freq']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'ecc') this.ecc = v; else this.freq = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.ecc = 12; this.freq = 8;
      (document.getElementById('ecc') as EncSlider).value = 12;
      (document.getElementById('freq') as EncSlider).value = 8;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // --- Grating row at growing eccentricity (top). ---
    const rowY = h * 0.18, patch = Math.min(h * 0.16, 64);
    const fixX = w * 0.12, midY = rowY + patch / 2;
    // Fixation cross.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(fixX - 8, midY); ctx.lineTo(fixX + 8, midY); ctx.moveTo(fixX, midY - 8); ctx.lineTo(fixX, midY + 8); ctx.stroke();

    const eccs = [0, 4, 8, 12, 16, 20, 25, 30];
    const startX = fixX + 28;
    const avail = w * 0.84 - (startX - fixX);
    eccs.forEach((E, i) => {
      const px = startX + (avail) * (i / (eccs.length - 1));
      const acuity = visualAcuity(E);     // contrast proxy
      // Draw a grating patch with contrast ∝ acuity.
      for (let x = 0; x < patch; x++) {
        const phase = (x / patch) * this.freq * 2 * Math.PI;
        const c = 0.5 + 0.5 * acuity * Math.cos(phase);
        const g = Math.round(255 * c);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(px + x - patch / 2, rowY, 1, patch);
      }
      const isHi = Math.abs(E - this.ecc) <= 2;
      ctx.strokeStyle = isHi ? theme.crimson : theme.inkAlpha(0.4); ctx.lineWidth = isHi ? 2.4 : 1;
      ctx.strokeRect(px - patch / 2, rowY, patch, patch);
      ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`${E}°`, px - 6, rowY + patch + 14);
    });

    // --- Acuity vs eccentricity curve (bottom). ---
    const plotX = w * 0.10, plotY = h * 0.50, plotW = w * 0.80, plotH = h * 0.30;
    const Emax = 30;
    const xOf = (E: number) => plotX + (E / Emax) * plotW;
    const yOf = (a: number) => plotY + (1 - a) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const E = (Emax * i) / 200;
      const px = xOf(E), py = yOf(visualAcuity(E));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current eccentricity marker.
    ctx.strokeStyle = theme.goldAlpha(0.7); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(this.ecc), plotY); ctx.lineTo(xOf(this.ecc), plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(xOf(this.ecc), yOf(visualAcuity(this.ecc)), 4.5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let E = 0; E <= 30; E += 10) ctx.fillText(`${E}°`, xOf(E) - 6, plotY + plotH + 14);
    for (let a = 0; a <= 1; a += 0.5) ctx.fillText(a.toFixed(1), plotX - 26, yOf(a) + 3);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('eccentricity from fovea', plotX + plotW * 0.36, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 30, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('relative acuity', plotX < 0 ? -40 : -42, 0); ctx.restore();

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`at ${this.ecc.toFixed(1)}° acuity is ${(visualAcuity(this.ecc) * 100).toFixed(0)}% of foveal`, plotX, h * 0.92);
  }
}
window.addEventListener('DOMContentLoaded', () => new FoveaPeriphery());
