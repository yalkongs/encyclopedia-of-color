import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { rayleighIntensity } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class RayleighSpectrum {
  private stage: CanvasStage;
  private lambda = 450;     // probe wavelength in nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.lambda = hydrateNumber('lambda', 450);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('lambda', () => Math.round(this.lambda));

    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      (document.getElementById('lambda') as EncSlider).value = 450;
      this.lambda = 450; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Curve domain: 380..780 nm
    const lMin = 380, lMax = 780;
    const padL = 70, padR = 50, padT = 50, padB = 70;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const x0 = padL, y0 = h - padB;
    const x1 = padL + plotW, y1 = padT;

    // Axes
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
    ctx.stroke();

    // Wavelength ticks
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    [400, 450, 500, 550, 600, 650, 700, 750].forEach((l) => {
      const x = x0 + ((l - lMin) / (lMax - lMin)) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 4);
      ctx.stroke();
      ctx.fillText(`${l}`, x - 12, y0 + 18);
    });
    ctx.fillText('λ (nm)', x1 - 36, y0 + 38);

    // Y ticks at 1× and 5× and 10×
    [1, 2, 5, 10].forEach((m) => {
      const y = y0 - (Math.log10(m) / 1.2) * plotH;
      ctx.strokeStyle = axisStyle.grid;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = axisStyle.label;
      ctx.fillText(`${m}×`, x0 - 24, y + 4);
    });

    // Spectrum band along x-axis (visible colours)
    const bandH = 14;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, '#5b3aa6');
    grad.addColorStop(0.18, '#3559b8');
    grad.addColorStop(0.30, '#4ab4a3');
    grad.addColorStop(0.45, '#7bc14a');
    grad.addColorStop(0.55, '#cdb04a');
    grad.addColorStop(0.65, '#cd7a3a');
    grad.addColorStop(0.85, '#a8332a');
    grad.addColorStop(1, '#5d1f1c');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0 + 26, plotW, bandH);

    // The 1/λ⁴ curve, normalized so red (700nm) = 1
    const reference = 700;
    const refI = rayleighIntensity(reference);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let l = lMin; l <= lMax; l += 2) {
      const I = rayleighIntensity(l) / refI;
      const x = x0 + ((l - lMin) / (lMax - lMin)) * plotW;
      const y = y0 - (Math.log10(I + 0.001) / 1.2) * plotH;
      if (l === lMin) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Probe at current λ
    const I_at = rayleighIntensity(this.lambda) / refI;
    const probeX = x0 + ((this.lambda - lMin) / (lMax - lMin)) * plotW;
    const probeY = y0 - (Math.log10(I_at) / 1.2) * plotH;
    ctx.strokeStyle = theme.goldDeep;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(probeX, y0); ctx.lineTo(probeX, probeY);
    ctx.lineTo(x0, probeY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(probeX, probeY, 6, 0, Math.PI * 2); ctx.fill();

    // Readout
    ctx.font = 'italic 18px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`λ = ${Math.round(this.lambda)} nm`, padL, padT - 12);
    ctx.fillText(`I(λ) / I(700) = ${I_at.toFixed(2)}`, padL + 200, padT - 12);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = axisStyle.label;
    ctx.fillText('log₁₀-scaled intensity, normalised to red @ 700 nm', padL, padT - 32);
  }
}

window.addEventListener('DOMContentLoaded', () => new RayleighSpectrum());
