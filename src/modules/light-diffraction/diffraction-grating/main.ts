import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function lambdaToColor(lam: number): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  const to8 = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v)));
  return `rgb(${to8(r)},${to8(g)},${to8(b)})`;
}

const N_SLITS = 24;  // illuminated slits → peak sharpness

class Grating {
  private stage: CanvasStage;
  private density = 600; // lines/mm
  private lambda = 550;  // nm
  private white = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.density = hydrateNumber('density', 600);
    this.lambda = hydrateNumber('lambda', 550);
    this.white = hydrateNumber('white', 0);
    (document.getElementById('density') as EncSlider).value = this.density;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('white') as EncSlider).value = this.white;
    registerStateParam('density', () => this.density);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('white', () => this.white);
    for (const id of ['density', 'lambda', 'white']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'density') this.density = v;
        else if (id === 'lambda') this.lambda = v;
        else this.white = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.density = 600; this.lambda = 550; this.white = 0;
      (document.getElementById('density') as EncSlider).value = 600;
      (document.getElementById('lambda') as EncSlider).value = 550;
      (document.getElementById('white') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private dMetres(): number {
    return 1 / (this.density * 1000); // line spacing in metres
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 46;
    const plotX = pad + 6, plotY = pad - 16;
    const plotW = w - pad * 2, plotH = h - pad * 2.2;
    const thetaMax = 80 * (Math.PI / 180);
    const xOf = (theta: number) => plotX + ((theta + thetaMax) / (2 * thetaMax)) * plotW;
    const yOf = (I: number) => plotY + (1 - I) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath(); ctx.moveTo(xOf(0), plotY); ctx.lineTo(xOf(0), plotY + plotH); ctx.stroke();

    const dM = this.dMetres();

    if (this.white === 0) {
      // Monochromatic N-slit intensity.
      const lamM = this.lambda * 1e-9;
      const color = lambdaToColor(this.lambda);
      const aM = dM * 0.5; // slit width = half the period
      ctx.strokeStyle = color; ctx.lineWidth = 1.6;
      ctx.beginPath();
      const steps = 2400;
      for (let i = 0; i <= steps; i++) {
        const theta = -thetaMax + (2 * thetaMax) * (i / steps);
        const delta = (Math.PI * dM * Math.sin(theta)) / lamM;
        let gr: number;
        const sinHalf = Math.sin(delta);
        if (Math.abs(sinHalf) < 1e-7) gr = 1;
        else gr = (Math.sin(N_SLITS * delta) / (N_SLITS * sinHalf)) ** 2;
        const alpha = (Math.PI * aM * Math.sin(theta)) / lamM;
        const env = Math.abs(alpha) < 1e-9 ? 1 : (Math.sin(alpha) / alpha) ** 2;
        const I = gr * env;
        const px = xOf(theta), py = yOf(I);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Order labels.
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      for (let m = -4; m <= 4; m++) {
        const s = (m * lamM) / dM;
        if (Math.abs(s) > 1) continue;
        const theta = Math.asin(s);
        ctx.fillText(`${m}`, xOf(theta) - 3, plotY - 2);
      }
    } else {
      // White light: each order fans into a spectrum of coloured vertical lines.
      for (let m = -3; m <= 3; m++) {
        if (m === 0) continue;
        for (let lam = 400; lam <= 700; lam += 4) {
          const s = (m * lam * 1e-9) / dM;
          if (Math.abs(s) > 1) continue;
          const theta = Math.asin(s);
          ctx.strokeStyle = lambdaToColor(lam); ctx.globalAlpha = 0.8; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(xOf(theta), plotY + plotH * 0.15); ctx.lineTo(xOf(theta), plotY + plotH); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // m=0 white line.
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(xOf(0), plotY + plotH * 0.15); ctx.lineTo(xOf(0), plotY + plotH); ctx.stroke();
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      for (let m = -3; m <= 3; m++) {
        const s = (m * 550e-9) / dM;
        if (Math.abs(s) > 1) continue;
        ctx.fillText(`${m}`, xOf(Math.asin(s)) - 3, plotY - 2);
      }
    }

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let deg = -80; deg <= 80; deg += 40) {
      const theta = deg * (Math.PI / 180);
      ctx.fillText(`${deg}°`, xOf(theta) - 10, plotY + plotH + 14);
    }
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('diffraction angle θ', plotX + plotW * 0.4, plotY + plotH + 28);

    // Readouts.
    const m1 = (1 * this.lambda * 1e-9) / dM;
    const ang1 = Math.abs(m1) <= 1 ? Math.asin(m1) * RAD : NaN;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${this.density} lines/mm   →   d = ${(dM * 1e9).toFixed(0)} nm`, plotX + 6, plotY + 14);
    if (this.white === 0) {
      ctx.fillText(`λ = ${this.lambda} nm   1st order at θ₁ = ${isFinite(ang1) ? ang1.toFixed(2) + '°' : '— (evanescent)'}`, plotX + 6, plotY + 32);
    } else {
      ctx.fillText(`white light — orders ±1, ±2, ±3 each a full spectrum`, plotX + 6, plotY + 32);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new Grating());
