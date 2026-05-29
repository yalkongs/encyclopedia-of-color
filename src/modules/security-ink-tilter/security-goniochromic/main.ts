import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { spectralToXYZ, xyzToSrgb, rgbToCssHex, CMF_1931_2DEG, WAVELENGTH_STEP } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAMBDA0 = 600, N_AVG = 1.45;
const Yref = CMF_1931_2DEG.reduce((s, r) => s + r.yBar, 0) * WAVELENGTH_STEP;

function peakWavelength(angleRad: number): number {
  const sinF = Math.sin(angleRad) / N_AVG;
  return LAMBDA0 * Math.sqrt(1 - sinF * sinF);
}
// approximate DBR reflectance envelope: Gaussian peak that narrows with layer count
function reflectanceEnv(layers: number, angleRad: number) {
  const lp = peakWavelength(angleRad);
  const sigma = 90 / Math.sqrt(layers);
  const height = Math.min(0.96, 0.28 + 0.085 * layers);
  return (lambda: number) => height * Math.exp(-0.5 * ((lambda - lp) / sigma) ** 2);
}

function swatchColor(layers: number, angleRad: number): string {
  const xyz = spectralToXYZ(reflectanceEnv(layers, angleRad));
  const rgb = xyzToSrgb({ X: xyz.X / Yref, Y: xyz.Y / Yref, Z: xyz.Z / Yref });
  const m = Math.max(rgb.r, rgb.g, rgb.b);
  if (m > 0) { rgb.r = Math.min(1, rgb.r / m); rgb.g = Math.min(1, rgb.g / m); rgb.b = Math.min(1, rgb.b / m); }
  return rgbToCssHex(rgb);
}

class Goniochromic {
  private stage: CanvasStage;
  private tilt = 0;
  private layers = 5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tilt = hydrateNumber('tilt', 0);
    this.layers = hydrateNumber('layers', 5);
    const st = document.getElementById('tilt') as EncSlider;
    st.value = this.tilt;
    st.addEventListener('input', (e) => { this.tilt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tilt', () => Math.round(this.tilt));
    const sl = document.getElementById('layers') as EncSlider;
    sl.value = this.layers;
    sl.addEventListener('input', (e) => { this.layers = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('layers', () => Math.round(this.layers));
    document.addEventListener('reset-params', () => { this.tilt = 0; this.layers = 5; st.value = 0; sl.value = 5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const ang = (this.tilt * Math.PI) / 180;
    const N = Math.round(this.layers);
    const col = swatchColor(N, ang);

    // left: stack cross-section + swatch
    const sx = 50, sy = 60, sw = Math.min(w * 0.32, 260), layerH = Math.min(18, (h * 0.45) / (2 * N));
    for (let i = 0; i < 2 * N; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#3a4a66' : '#cdd6e4'; // high / low index
      ctx.fillRect(sx, sy + i * layerH, sw, layerH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, 2 * N * layerH);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${N} layer pairs (high / low index)`, sx, sy - 12);
    // resulting swatch
    const swY = sy + 2 * N * layerH + 30;
    ctx.fillStyle = col; ctx.fillRect(sx, swY, sw, 64);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(sx, swY, sw, 64);
    ctx.fillStyle = theme.inkSoft; ctx.fillText('reflected colour', sx, swY - 8);

    // right: reflectance spectrum
    const gx = sx + sw + 70, gy = 60, gw = w - gx - 50, gh = h - gy - 60;
    const X = (l: number) => gx + ((l - 400) / 300) * gw, Y = (r: number) => gy + gh - r * gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 400; l <= 700; l += 50) { ctx.beginPath(); ctx.moveTo(X(l), gy); ctx.lineTo(X(l), gy + gh); ctx.stroke(); }
    for (let i = 0; i <= 4; i++) { const yy = gy + (i / 4) * gh; ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    const env = reflectanceEnv(N, ang);
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let l = 400; l <= 700; l += 2) { const x = X(l), y = Y(Math.min(1, env(l))); l === 400 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    const lp = peakWavelength(ang);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(lp), gy); ctx.lineTo(X(lp), gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 700; l += 50) ctx.fillText(`${l}`, X(l), gy + gh + 15);
    ctx.fillText('wavelength (nm) · reflectance', gx + gw / 2, gy + gh + 30);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${N} layers · tilt ${Math.round(this.tilt)}° — peak ${Math.round(lp)} nm; more layers narrow the peak and deepen the colour`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Goniochromic());
