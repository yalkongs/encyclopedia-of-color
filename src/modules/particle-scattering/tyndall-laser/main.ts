import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function lambdaRGB(lam: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  return [r, g, b];
}

class Tyndall {
  private stage: CanvasStage;
  private c = 40;
  private lambda = 520;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 40);
    this.lambda = hydrateNumber('lambda', 520);
    (document.getElementById('c') as EncSlider).value = this.c;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('c', () => this.c);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['c', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'c') this.c = v; else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.c = 40; this.lambda = 520;
      (document.getElementById('c') as EncSlider).value = 40;
      (document.getElementById('lambda') as EncSlider).value = 520;
      this.draw(); notifyStateChange();
    });
  }

  // Attenuation coefficient μ ∝ c·λ⁻⁴ (per unit beam length in canvas units).
  private mu(): number {
    const ref = 550;
    return (this.c / 100) * Math.pow(ref / this.lambda, 4) * 0.010;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const [r, g, b] = lambdaRGB(this.lambda);
    const mu = this.mu();

    // Tank with beam entering from the left.
    const tankX0 = w * 0.10, tankX1 = w * 0.74, beamY = h * 0.42;
    const tankY0 = h * 0.12, tankY1 = h * 0.72;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(tankX0, tankY0, tankX1 - tankX0, tankY1 - tankY0);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.strokeRect(tankX0, tankY0, tankX1 - tankX0, tankY1 - tankY0);

    // Beam core + side glow, attenuating with depth.
    const beamLen = tankX1 - tankX0;
    for (let i = 0; i < beamLen; i += 2) {
      const z = i;
      const I = Math.exp(-mu * z);
      const x = tankX0 + i;
      // Core line.
      ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${I})`;
      ctx.fillRect(x, beamY - 2, 2, 4);
      // Side glow (Tyndall) brightness ∝ scattered light ∝ μ·I.
      const glow = Math.min(0.6, mu * 1400 * I);
      const grad = ctx.createLinearGradient(x, beamY - 40, x, beamY + 40);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${glow})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, beamY - 40, 2, 80);
    }

    // Source label + emerging beam.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('laser →', tankX0 - 4, beamY - 46);
    const Iout = Math.exp(-mu * beamLen);
    ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${Iout})`;
    ctx.fillRect(tankX1, beamY - 2, 18, 4);

    // I(z) decay curve below the tank.
    const plotX = tankX0, plotY = tankY1 + 22, plotW = beamLen, plotH = h * 0.16;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i += 2) {
      const I = Math.exp(-mu * i);
      const px = plotX + i, py = plotY + (1 - I) * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('I(z) = I₀ e^(−μz)', plotX + 6, plotY + 14);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`concentration = ${this.c}   λ = ${this.lambda} nm`, 16, 30);
    ctx.fillText(`beam transmitted to far wall = ${(Iout * 100).toFixed(1)}%`, 16, 52);
  }
}
window.addEventListener('DOMContentLoaded', () => new Tyndall());
