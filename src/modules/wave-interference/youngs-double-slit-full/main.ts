import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function lambdaToColor(lam: number): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  let s = 1;
  if (lam < 420)      s = 0.3 + 0.7 * (lam - 380) / 40;
  else if (lam > 700) s = 0.3 + 0.7 * (780 - lam) / 80;
  const to8 = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v * s)));
  return `rgb(${to8(r)},${to8(g)},${to8(b)})`;
}

class YoungDoubleSlit {
  private stage: CanvasStage;
  private d = 80;        // µm
  private lambda = 550;  // nm
  private L = 100;       // cm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 80);
    this.lambda = hydrateNumber('lambda', 550);
    this.L = hydrateNumber('L', 100);
    (document.getElementById('d') as EncSlider).value = this.d;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('L') as EncSlider).value = this.L;
    registerStateParam('d', () => this.d);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('L', () => this.L);
    for (const id of ['d', 'lambda', 'L']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'd') this.d = v;
        else if (id === 'lambda') this.lambda = v;
        else this.L = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.d = 80; this.lambda = 550; this.L = 100;
      (document.getElementById('d') as EncSlider).value = 80;
      (document.getElementById('lambda') as EncSlider).value = 550;
      (document.getElementById('L') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const color = lambdaToColor(this.lambda);
    const slitX = w * 0.18;
    const screenX = w * 0.80;
    const cy = h * 0.5;
    const slitGapPx = Math.min(h * 0.32, 12 + this.d * 0.7);
    const s1 = cy - slitGapPx / 2;
    const s2 = cy + slitGapPx / 2;

    // Barrier with two slits.
    ctx.fillStyle = theme.inkAlpha(0.5);
    ctx.fillRect(slitX - 3, 0, 6, s1 - 6);
    ctx.fillRect(slitX - 3, s1 + 6, 6, (s2 - 6) - (s1 + 6));
    ctx.fillRect(slitX - 3, s2 + 6, 6, h - (s2 + 6));

    // Circular wavefronts from each slit (constant-phase rings).
    const ringStep = Math.max(10, this.lambda * 0.05);
    ctx.lineWidth = 0.7;
    for (const [sx, sy] of [[slitX, s1], [slitX, s2]] as const) {
      ctx.strokeStyle = theme.slateAlpha(0.18);
      for (let rr = ringStep; rr < (screenX - slitX) * 1.4; rr += ringStep) {
        ctx.beginPath(); ctx.arc(sx, sy, rr, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
      }
    }

    // Incident plane wave on the left.
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.lineWidth = 1;
    for (let x = 12; x < slitX - 8; x += ringStep) {
      ctx.beginPath(); ctx.moveTo(x, cy - h * 0.32); ctx.lineTo(x, cy + h * 0.32); ctx.stroke();
    }

    // Screen.
    ctx.strokeStyle = theme.inkAlpha(0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(screenX, h * 0.08); ctx.lineTo(screenX, h * 0.92); ctx.stroke();

    // Intensity pattern on the screen (cos² fringes).
    // Geometry: path diff = d·sinθ; for small angles y/L. Use real units.
    const dM = this.d * 1e-6;        // m
    const lamM = this.lambda * 1e-9; // m
    const Lm = this.L * 1e-2;        // m
    const fringeM = (lamM * Lm) / dM; // Δy in metres
    // Map: screen vertical pixel ↔ y in metres. Choose scale so ~6 fringes fit.
    const halfScreenPx = h * 0.42;
    const yScale = (fringeM * 5) / halfScreenPx; // m per px
    const profileW = w * 0.13;

    ctx.beginPath();
    for (let py = -halfScreenPx; py <= halfScreenPx; py += 1) {
      const yM = py * yScale;
      const phase = (Math.PI * dM * yM) / (lamM * Lm); // π d y /(λ L)
      const I = Math.cos(phase) ** 2;
      const px = screenX + 6 + I * profileW;
      const sy = cy + py;
      if (py === -halfScreenPx) ctx.moveTo(px, sy); else ctx.lineTo(px, sy);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();

    // Bright-fringe tick marks + colour bands on the screen line.
    for (let m = -5; m <= 5; m++) {
      const yM = m * fringeM;
      const py = yM / yScale;
      if (Math.abs(py) > halfScreenPx) continue;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(screenX - 2, cy + py - 1.5, 4, 3);
      ctx.globalAlpha = 1;
    }

    // Readouts.
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`d = ${this.d} µm    λ = ${this.lambda} nm    L = ${this.L} cm`, 14, 28);
    ctx.fillText(`Δy = λL/d = ${(fringeM * 1000).toFixed(2)} mm`, 14, 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('plane wave', 14, cy - h * 0.34);
    ctx.fillText('screen I(y)', screenX + 8, h * 0.07);
  }
}
window.addEventListener('DOMContentLoaded', () => new YoungDoubleSlit());
