import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { airyIntensity, RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const FIRST_ZERO = 3.8317;  // first zero of J₁

class AiryDisc {
  private stage: CanvasStage;
  private D = 20;        // µm
  private lambda = 550;  // nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.D = hydrateNumber('D', 20);
    this.lambda = hydrateNumber('lambda', 550);
    (document.getElementById('D') as EncSlider).value = this.D;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('D', () => this.D);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['D', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'D') this.D = v; else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.D = 20; this.lambda = 550;
      (document.getElementById('D') as EncSlider).value = 20;
      (document.getElementById('lambda') as EncSlider).value = 550;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const split = Math.floor(w * 0.46);
    this.drawPattern(ctx, 0, 0, split, h);
    this.drawProfile(ctx, split, 0, w - split, h);
  }

  // u = (π D / λ) sinθ.  Map screen radius (px) to u.  uMax shows ~3 rings.
  private uMax(): number { return FIRST_ZERO * 3.2; }

  private drawPattern(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    const cx = x0 + w / 2, cy = y0 + h * 0.5;
    const rMaxPx = Math.min(w * 0.44, h * 0.42);
    const uMax = this.uMax();

    // Colour for wavelength.
    const lam = this.lambda;
    let cr = 1, cg = 1, cb = 1;
    if (lam < 490) { cr = 0.3; cg = 0.5; cb = 1; }
    else if (lam < 560) { cr = 0.4; cg = 1; cb = 0.4; }
    else if (lam < 600) { cr = 0.9; cg = 0.95; cb = 0.3; }
    else { cr = 1; cg = 0.4; cb = 0.3; }

    // Radial gradient sampling Airy intensity.
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMaxPx);
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const frac = i / N;
      const u = frac * uMax;
      const I = airyIntensity(u);
      const Ig = Math.pow(I, 0.5); // gamma lift faint rings
      grad.addColorStop(frac, `rgb(${Math.round(cr * 255 * Ig)},${Math.round(cg * 255 * Ig)},${Math.round(cb * 255 * Ig)})`);
    }
    ctx.fillStyle = '#08080c';
    ctx.beginPath(); ctx.arc(cx, cy, rMaxPx, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, rMaxPx, 0, 2 * Math.PI); ctx.fill();

    // First dark ring marker.
    const r1Px = (FIRST_ZERO / uMax) * rMaxPx;
    ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r1Px, 0, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('1st dark ring', cx - 30, cy - r1Px - 6);
  }

  private drawProfile(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    const pad = 40;
    const plotX = x0 + pad, plotY = y0 + pad - 12;
    const plotW = w - pad * 1.5, plotH = h - pad * 2.4;
    const uMax = this.uMax();
    const xOf = (u: number) => plotX + (u / uMax) * plotW;
    const yOf = (I: number) => plotY + (1 - I) * plotH;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const u = (uMax * i) / 600;
      const I = airyIntensity(u);
      const px = xOf(u), py = yOf(I);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // First zero marker.
    ctx.strokeStyle = theme.goldAlpha(0.7); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(FIRST_ZERO), plotY); ctx.lineTo(xOf(FIRST_ZERO), plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('0', plotX - 4, plotY + plotH + 13);
    ctx.fillText('3.83', xOf(FIRST_ZERO) - 10, plotY + plotH + 13);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('u = (πD/λ)·sinθ', plotX + plotW * 0.32, plotY + plotH + 26);

    // Readouts: first dark-ring angle.
    const DM = this.D * 1e-6, lamM = this.lambda * 1e-9;
    const theta1 = Math.asin(Math.min(1, 1.22 * lamM / DM)) * RAD;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`D = ${this.D} µm   λ = ${this.lambda} nm`, plotX + 2, plotY + 6);
    ctx.fillText(`θ₁ = 1.22 λ/D = ${theta1.toFixed(2)}°`, plotX + 2, plotY + 24);
  }
}
window.addEventListener('DOMContentLoaded', () => new AiryDisc());
