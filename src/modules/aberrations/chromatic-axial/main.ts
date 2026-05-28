import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { sellmeierN, SELLMEIER } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function lambdaRGB(lam: number): string {
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

const N550 = sellmeierN(550, SELLMEIER.BK7.B, SELLMEIER.BK7.C);

class ChromaticAxial {
  private stage: CanvasStage;
  private f = 100;    // cm at 550nm
  private disp = 1.0; // dispersion multiplier

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.f = hydrateNumber('f', 100);
    this.disp = hydrateNumber('disp', 1.0);
    (document.getElementById('f') as EncSlider).value = this.f;
    (document.getElementById('disp') as EncSlider).value = this.disp;
    registerStateParam('f', () => this.f);
    registerStateParam('disp', () => this.disp);
    for (const id of ['f', 'disp']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'f') this.f = v; else this.disp = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.f = 100; this.disp = 1.0;
      (document.getElementById('f') as EncSlider).value = 100;
      (document.getElementById('disp') as EncSlider).value = 1.0;
      this.draw(); notifyStateChange();
    });
  }

  // Wavelength-dependent focal length.
  private focal(lam: number): number {
    const n = sellmeierN(lam, SELLMEIER.BK7.B, SELLMEIER.BK7.C);
    const denom = (N550 - 1) + this.disp * (n - N550);
    return this.f * (N550 - 1) / denom;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const lensX = w * 0.16, cy = h * 0.52;
    const hLens = Math.min(h * 0.30, 78);
    const sx = (w * 0.74) / 170; // cm → px; span enough for f up to ~165

    // Axis.
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, cy); ctx.lineTo(w - 8, cy); ctx.stroke();

    // Lens.
    ctx.fillStyle = theme.slateAlpha(0.18); ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lensX, cy - hLens);
    ctx.quadraticCurveTo(lensX - 14, cy, lensX, cy + hLens);
    ctx.quadraticCurveTo(lensX + 14, cy, lensX, cy - hLens);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Wavelength rays converging to their foci.
    const lambdas = [430, 486, 550, 589, 656, 700];
    for (const lam of lambdas) {
      const F = lensX + this.focal(lam) * sx;
      const col = lambdaRGB(lam);
      ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.85;
      for (const sgn of [-1, 1]) {
        const yIn = cy + sgn * hLens * 0.7;
        ctx.beginPath(); ctx.moveTo(8, yIn); ctx.lineTo(lensX, yIn); ctx.lineTo(F, cy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Focus tick.
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(F, cy, 3, 0, 2 * Math.PI); ctx.fill();
    }

    // F-line (blue 486) and C-line (red 656) focal span = longitudinal CA.
    const fF = this.focal(486), fC = this.focal(656);
    const xF = lensX + fF * sx, xC = lensX + fC * sx;
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(xF, cy + h * 0.16); ctx.lineTo(xC, cy + h * 0.16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xF, cy + h * 0.16 - 5); ctx.lineTo(xF, cy + h * 0.16 + 5); ctx.moveTo(xC, cy + h * 0.16 - 5); ctx.lineTo(xC, cy + h * 0.16 + 5); ctx.stroke();
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`LCA = ${(fC - fF).toFixed(1)} cm`, (xF + xC) / 2 - 28, cy + h * 0.16 - 8);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`f(550) = ${this.f} cm   dispersion ×${this.disp.toFixed(2)}`, 16, 28);
    ctx.fillText(`f(486 blue) = ${fF.toFixed(1)} cm    f(656 red) = ${fC.toFixed(1)} cm`, 16, 50);
    ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('blue focuses nearer than red — no single sharp focus', 16, 70);
  }
}
window.addEventListener('DOMContentLoaded', () => new ChromaticAxial());
