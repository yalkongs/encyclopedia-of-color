import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { airyTransmittance, reflectiveFinesse } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class FabryPerot {
  private stage: CanvasStage;
  private R = 0.70;
  private d = 50;        // µm
  private lambda = 633;  // nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.R = hydrateNumber('R', 0.70);
    this.d = hydrateNumber('d', 50);
    this.lambda = hydrateNumber('lambda', 633);
    (document.getElementById('R') as EncSlider).value = this.R;
    (document.getElementById('d') as EncSlider).value = this.d;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('R', () => this.R);
    registerStateParam('d', () => this.d);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['R', 'd', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'R') this.R = v;
        else if (id === 'd') this.d = v;
        else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.R = 0.70; this.d = 50; this.lambda = 633;
      (document.getElementById('R') as EncSlider).value = 0.70;
      (document.getElementById('d') as EncSlider).value = 50;
      (document.getElementById('lambda') as EncSlider).value = 633;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 50;
    const plotX = pad + 6, plotY = pad - 16;
    const plotW = w - pad * 2, plotH = h - pad * 2.2;

    // Plot T vs δ over 3 orders: δ ∈ [0, 6π].
    const deltaMax = 6 * Math.PI;
    const xOf = (delta: number) => plotX + (delta / deltaMax) * plotW;
    const yOf = (T: number) => plotY + (1 - T) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Order gridlines at δ = 2πm.
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 0.5;
    for (let m = 0; m <= 3; m++) {
      const dx = xOf(2 * Math.PI * m);
      ctx.beginPath(); ctx.moveTo(dx, plotY); ctx.lineTo(dx, plotY + plotH); ctx.stroke();
    }

    // Comparison: low-R reference curve (R=0.2) faint.
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const delta = (deltaMax * i) / 600;
      const T = airyTransmittance(delta, 0.2);
      const px = xOf(delta), py = yOf(T);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Main curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 1200; i++) {
      const delta = (deltaMax * i) / 1200;
      const T = airyTransmittance(delta, this.R);
      const px = xOf(delta), py = yOf(T);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // FWHM annotation around the central peak (δ = 2π).
    const finesse = reflectiveFinesse(this.R);
    const fwhmDelta = (2 * Math.PI) / finesse;  // FWHM in δ units
    const cDelta = 2 * Math.PI;
    ctx.strokeStyle = theme.goldAlpha(0.8); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xOf(cDelta - fwhmDelta / 2), yOf(0.5));
    ctx.lineTo(xOf(cDelta + fwhmDelta / 2), yOf(0.5));
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('FWHM', xOf(cDelta) + 6, yOf(0.5) - 4);

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let m = 0; m <= 3; m++) ctx.fillText(`${m}`, xOf(2 * Math.PI * m) - 3, plotY + plotH + 14);
    for (let p = 0; p <= 1.0; p += 0.25) ctx.fillText(p.toFixed(2), plotX - 32, yOf(p) + 3);

    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('round-trip order  δ / 2π', plotX + plotW * 0.4, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 36, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('transmittance T', -50, 0); ctx.restore();

    // FSR in wavelength: Δλ = λ²/(2d).
    const fsrNm = (this.lambda * this.lambda) / (2 * this.d * 1000); // d µm → nm
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`R = ${this.R.toFixed(2)}    finesse 𝓕 = ${finesse.toFixed(1)}`, plotX + 6, plotY + 14);
    ctx.fillText(`FSR = λ²/2d = ${fsrNm.toFixed(3)} nm    (d = ${this.d} µm, λ = ${this.lambda} nm)`, plotX + 6, plotY + 32);
  }
}
window.addEventListener('DOMContentLoaded', () => new FabryPerot());
