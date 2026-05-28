import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { spectralToXYZ, xyzToSrgb } from '@core/math/spectral';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// White reference luminance for normalising the spectral integration.
let yWhite = 0;
for (const row of CMF_1931_2DEG) yWhite += row.yBar;

function monoColor(lam: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  return [r, g, b];
}

class Photoelasticity {
  private stage: CanvasStage;
  private load = 55;
  private white = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.load = hydrateNumber('load', 55);
    this.white = hydrateNumber('white', 1);
    (document.getElementById('load') as EncSlider).value = this.load;
    (document.getElementById('white') as EncSlider).value = this.white;
    registerStateParam('load', () => this.load);
    registerStateParam('white', () => this.white);
    for (const id of ['load', 'white']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'load') this.load = v; else this.white = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.load = 55; this.white = 1;
      (document.getElementById('load') as EncSlider).value = 55;
      (document.getElementById('white') as EncSlider).value = 1;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Specimen rectangle, point load at top-centre (Flamant solution).
    const sx = w * 0.30, sw = w * 0.42;
    const sy = h * 0.16, sh = h * 0.66;
    const lx = sx + sw / 2, ly = sy;           // load point
    const K = 1.5e6;                            // px·nm retardation scale (≈5 fringe orders at the base)
    const step = 2;

    for (let py = sy; py < sy + sh; py += step) {
      for (let px = sx; px < sx + sw; px += step) {
        const dx = px - lx, dy = py - ly;
        const r2 = dx * dx + dy * dy;
        if (r2 < 25) continue;                  // skip singular load point
        // Flamant principal-stress difference ∝ cosφ / r = dy / r².
        const R = (this.load / 100) * K * (dy / r2);  // retardation in nm
        let cr: number, cg: number, cb: number;
        if (this.white === 1) {
          const xyz = spectralToXYZ((lam) => Math.sin((Math.PI * R) / lam) ** 2);
          const scale = 1 / (yWhite * 5);
          const rgb = xyzToSrgb({ X: xyz.X * scale, Y: xyz.Y * scale, Z: xyz.Z * scale });
          cr = rgb.r * 255; cg = rgb.g * 255; cb = rgb.b * 255;
        } else {
          const lam = 550;
          const I = Math.sin((Math.PI * R) / lam) ** 2;
          const [mr, mg, mb] = monoColor(lam);
          cr = mr * 255 * I; cg = mg * 255 * I; cb = mb * 255 * I;
        }
        ctx.fillStyle = `rgb(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)})`;
        ctx.fillRect(px, py, step, step);
      }
    }

    // Specimen outline + load arrow.
    ctx.strokeStyle = theme.inkAlpha(0.6); ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(lx, sy - 38); ctx.lineTo(lx, sy - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, sy - 4); ctx.lineTo(lx - 6, sy - 14); ctx.moveTo(lx, sy - 4); ctx.lineTo(lx + 6, sy - 14); ctx.stroke();
    ctx.fillStyle = theme.crimson; ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('load P', lx + 10, sy - 18);

    // Crossed-polarizer markers.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('between crossed polarizers', sx, sy + sh + 18);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`applied load = ${this.load}%`, 16, 30);
    ctx.fillText(this.white ? 'white light — isochromatic colour fringes' : 'monochromatic — dark/bright fringes', 16, 52);
  }
}
window.addEventListener('DOMContentLoaded', () => new Photoelasticity());
