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

function sinc(x: number): number {
  if (Math.abs(x) < 1e-9) return 1;
  return Math.sin(x) / x;
}

class SlitPattern {
  private stage: CanvasStage;
  private mode = 1;     // 0 single, 1 double
  private a = 10;       // µm
  private d = 50;       // µm
  private lambda = 550; // nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mode = hydrateNumber('mode', 1);
    this.a = hydrateNumber('a', 10);
    this.d = hydrateNumber('d', 50);
    this.lambda = hydrateNumber('lambda', 550);
    (document.getElementById('mode') as EncSlider).value = this.mode;
    (document.getElementById('a') as EncSlider).value = this.a;
    (document.getElementById('d') as EncSlider).value = this.d;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('mode', () => this.mode);
    registerStateParam('a', () => this.a);
    registerStateParam('d', () => this.d);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['mode', 'a', 'd', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'mode') this.mode = Math.round(v);
        else if (id === 'a') this.a = v;
        else if (id === 'd') this.d = v;
        else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.mode = 1; this.a = 10; this.d = 50; this.lambda = 550;
      (document.getElementById('mode') as EncSlider).value = 1;
      (document.getElementById('a') as EncSlider).value = 10;
      (document.getElementById('d') as EncSlider).value = 50;
      (document.getElementById('lambda') as EncSlider).value = 550;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const color = lambdaToColor(this.lambda);
    const pad = 46;
    const plotX = pad + 6, plotY = pad - 16;
    const plotW = w - pad * 2, plotH = h - pad * 2.2;

    const aM = this.a * 1e-6, dM = this.d * 1e-6, lamM = this.lambda * 1e-9;
    // Angular range: show a few envelope lobes.  θ_env1 = asin(λ/a).
    const thetaMax = Math.min(0.5, 3 * (lamM / aM));
    const xOf = (theta: number) => plotX + ((theta + thetaMax) / (2 * thetaMax)) * plotW;
    const yOf = (I: number) => plotY + (1 - I) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    // Centre line.
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath(); ctx.moveTo(xOf(0), plotY); ctx.lineTo(xOf(0), plotY + plotH); ctx.stroke();

    // Envelope (single-slit sinc²) dashed when double.
    const envelope = (theta: number) => {
      const alpha = (Math.PI * aM * Math.sin(theta)) / lamM;
      return sinc(alpha) ** 2;
    };
    if (this.mode === 1) {
      ctx.strokeStyle = theme.inkAlpha(0.35); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const theta = -thetaMax + (2 * thetaMax) * (i / 400);
        const px = xOf(theta), py = yOf(envelope(theta));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Full intensity.
    ctx.strokeStyle = color; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 1000; i++) {
      const theta = -thetaMax + (2 * thetaMax) * (i / 1000);
      const env = envelope(theta);
      let I = env;
      if (this.mode === 1) {
        const beta = (Math.PI * dM * Math.sin(theta)) / lamM;
        I = env * Math.cos(beta) ** 2;
      }
      const px = xOf(theta), py = yOf(I);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let f = -1; f <= 1; f += 0.5) {
      const theta = f * thetaMax;
      ctx.fillText(`${(theta * RAD).toFixed(1)}°`, xOf(theta) - 12, plotY + plotH + 14);
    }
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('diffraction angle θ', plotX + plotW * 0.4, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 30, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('intensity I/I₀', -44, 0); ctx.restore();

    // Readouts.
    const env1 = Math.asin(Math.min(1, lamM / aM)) * RAD;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${this.mode ? 'double slit' : 'single slit'}   a = ${this.a} µm` + (this.mode ? `   d = ${this.d} µm` : ''), plotX + 6, plotY + 14);
    ctx.fillText(`λ = ${this.lambda} nm   envelope null at θ = ±${env1.toFixed(2)}°`, plotX + 6, plotY + 32);
  }
}
window.addEventListener('DOMContentLoaded', () => new SlitPattern());
