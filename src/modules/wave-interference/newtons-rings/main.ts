import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { thinFilmReflectanceGeneral } from '@core/math/physics';
import { spectralToXYZ, xyzToSrgb } from '@core/math/spectral';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N_GLASS = 1.52;

function monoColor(lam: number, I: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  return [r * 255 * I, g * 255 * I, b * 255 * I];
}

class NewtonsRings {
  private stage: CanvasStage;
  private R = 5.0;       // m (radius of curvature)
  private lambda = 589;  // nm
  private white = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.R = hydrateNumber('R', 5.0);
    this.lambda = hydrateNumber('lambda', 589);
    this.white = hydrateNumber('white', 0);
    (document.getElementById('R') as EncSlider).value = this.R;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('white') as EncSlider).value = this.white;
    registerStateParam('R', () => this.R);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('white', () => this.white);
    for (const id of ['R', 'lambda', 'white']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'R') this.R = v;
        else if (id === 'lambda') this.lambda = v;
        else this.white = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.R = 5.0; this.lambda = 589; this.white = 0;
      (document.getElementById('R') as EncSlider).value = 5.0;
      (document.getElementById('lambda') as EncSlider).value = 589;
      (document.getElementById('white') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  /** Air-gap reflectance at thickness t (nm) for wavelength λ (nm). */
  private reflectance(tNm: number, lam: number): number {
    return thinFilmReflectanceGeneral(lam, tNm, N_GLASS, 1.0, N_GLASS);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.42, cy = h * 0.5;
    const rMaxPx = Math.min(w * 0.38, h * 0.42);

    // Physical radius shown: enough for ~9 dark rings of current λ.
    const lamM = this.lambda * 1e-9;
    const rPhysMax = Math.sqrt(9 * lamM * this.R); // m
    const mPerPx = rPhysMax / rMaxPx;

    // Build radial colour stops.
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMaxPx);
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const frac = i / N;
      const rPx = frac * rMaxPx;
      const rPhys = rPx * mPerPx;          // m
      const tNm = (rPhys * rPhys) / (2 * this.R) * 1e9; // air-gap thickness, nm
      let col: [number, number, number];
      if (this.white === 1) {
        const xyz = spectralToXYZ((lam) => this.reflectance(tNm, lam));
        // Normalise: the cmf integral of a flat unit spectrum (white reference).
        let yWhite = 0;
        for (const row of CMF_1931_2DEG) yWhite += row.yBar;
        const scale = 1 / (yWhite * 5);
        const rgb = xyzToSrgb({ X: xyz.X * scale, Y: xyz.Y * scale, Z: xyz.Z * scale });
        col = [rgb.r * 255, rgb.g * 255, rgb.b * 255];
      } else {
        const I = this.reflectance(tNm, this.lambda);
        col = monoColor(this.lambda, I);
      }
      grad.addColorStop(frac, `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`);
    }

    // Dark backdrop then rings.
    ctx.fillStyle = '#0d0d12';
    ctx.beginPath(); ctx.arc(cx, cy, rMaxPx, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, rMaxPx, 0, 2 * Math.PI); ctx.fill();

    // Outline.
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, rMaxPx, 0, 2 * Math.PI); ctx.stroke();

    // First dark-ring radius marker.
    const r1Phys = Math.sqrt(1 * lamM * this.R); // m
    const r1Px = r1Phys / mPerPx;
    if (r1Px < rMaxPx) {
      ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r1Px, 0, 2 * Math.PI); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Readouts.
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`R = ${this.R.toFixed(1)} m`, 14, 28);
    ctx.fillText(this.white ? 'white-light illumination' : `λ = ${this.lambda} nm`, 14, 50);
    ctx.fillText(`r₁ (1st dark) = ${(r1Phys * 1000).toFixed(3)} mm`, 14, 72);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('dark centre: π phase flip at lower glass', 14, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new NewtonsRings());
