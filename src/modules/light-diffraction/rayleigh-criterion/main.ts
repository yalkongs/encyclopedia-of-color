import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { airyIntensity, RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const FIRST_ZERO = 3.8317;

class RayleighCriterion {
  private stage: CanvasStage;
  private sep = 1.00;   // Rayleigh units
  private D = 5;        // mm
  private lambda = 550; // nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sep = hydrateNumber('sep', 1.00);
    this.D = hydrateNumber('D', 5);
    this.lambda = hydrateNumber('lambda', 550);
    (document.getElementById('sep') as EncSlider).value = this.sep;
    (document.getElementById('D') as EncSlider).value = this.D;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('sep', () => this.sep);
    registerStateParam('D', () => this.D);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['sep', 'D', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'sep') this.sep = v;
        else if (id === 'D') this.D = v;
        else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.sep = 1.00; this.D = 5; this.lambda = 550;
      (document.getElementById('sep') as EncSlider).value = 1.00;
      (document.getElementById('D') as EncSlider).value = 5;
      (document.getElementById('lambda') as EncSlider).value = 550;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const uHalf = (this.sep * FIRST_ZERO) / 2; // half separation in u units
    // u-window: cover both discs plus margins.
    const uWin = uHalf + FIRST_ZERO * 2.0;
    const splitY = Math.floor(h * 0.52);

    // --- Top: combined 2D image (additive Airy discs). ---
    const cx = w * 0.5, cy = splitY * 0.52;
    const uPerPx = uWin / (Math.min(w * 0.44, splitY * 0.42));
    const imgR = Math.min(w * 0.46, splitY * 0.44);

    let cr = 1, cg = 1, cb = 1;
    const lam = this.lambda;
    if (lam < 490) { cr = 0.4; cg = 0.55; cb = 1; }
    else if (lam < 560) { cr = 0.5; cg = 1; cb = 0.5; }
    else if (lam < 600) { cr = 0.95; cg = 0.95; cb = 0.4; }
    else { cr = 1; cg = 0.45; cb = 0.35; }

    // Backdrop.
    ctx.fillStyle = '#07070b';
    ctx.fillRect(0, 0, w, splitY);

    // Render via offscreen pixel sampling on a coarse grid for performance.
    const step = 2;
    for (let py = -imgR; py <= imgR; py += step) {
      for (let px = -imgR * 1.4; px <= imgR * 1.4; px += step) {
        const uX = px * uPerPx, uY = py * uPerPx;
        const uA = Math.hypot(uX - uHalf, uY);
        const uB = Math.hypot(uX + uHalf, uY);
        const I = Math.min(1, airyIntensity(uA) + airyIntensity(uB));
        if (I < 0.004) continue;
        const Ig = Math.pow(I, 0.5);
        ctx.fillStyle = `rgb(${Math.round(cr * 255 * Ig)},${Math.round(cg * 255 * Ig)},${Math.round(cb * 255 * Ig)})`;
        ctx.fillRect(cx + px, cy + py, step, step);
      }
    }

    // --- Bottom: combined 1D intensity profile. ---
    const pad = 40;
    const plotX = pad + 6, plotY = splitY + 14;
    const plotW = w - pad * 2, plotH = h - splitY - 56;
    const xOf = (u: number) => plotX + ((u + uWin) / (2 * uWin)) * plotW;
    const profile = (u: number) => airyIntensity(u - uHalf) + airyIntensity(u + uHalf);
    // Normalise to single-peak max (=1 at large separation).
    let pmax = 0;
    for (let i = 0; i <= 200; i++) { const u = -uWin + 2 * uWin * (i / 200); pmax = Math.max(pmax, profile(u)); }
    const yOf = (I: number) => plotY + (1 - I / pmax) * plotH;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Individual discs (faint).
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const u = -uWin + 2 * uWin * (i / 400);
        const py = yOf(airyIntensity(u - sgn * uHalf));
        if (i === 0) ctx.moveTo(xOf(u), py); else ctx.lineTo(xOf(u), py);
      }
      ctx.stroke();
    }
    // Sum.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.9;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const u = -uWin + 2 * uWin * (i / 600);
      const py = yOf(profile(u));
      if (i === 0) ctx.moveTo(xOf(u), py); else ctx.lineTo(xOf(u), py);
    }
    ctx.stroke();

    // Central dip value.
    const dip = profile(0) / pmax;

    // Status.
    let status: string, scol: string;
    if (this.sep >= 1.0) { status = 'RESOLVED'; scol = theme.slate; }
    else if (this.sep >= 0.85) { status = 'at Rayleigh limit'; scol = theme.goldDeep; }
    else { status = 'UNRESOLVED'; scol = theme.crimson; }

    const DM = this.D * 1e-3, lamM = this.lambda * 1e-9;
    const rayleighDeg = Math.asin(Math.min(1, 1.22 * lamM / DM)) * RAD;
    const sepDeg = rayleighDeg * this.sep;

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`Δθ_min = 1.22 λ/D = ${(rayleighDeg * 3600).toFixed(3)} arcsec`, plotX + 4, plotY + 4);
    ctx.fillText(`separation = ${this.sep.toFixed(2)} × limit = ${(sepDeg * 3600).toFixed(3)} arcsec   ·   central dip ${(dip * 100).toFixed(0)}%`, plotX + 4, plotY + 22);
    ctx.fillStyle = scol; ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText(status, w - 150, 26);
  }
}
window.addEventListener('DOMContentLoaded', () => new RayleighCriterion());
