import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { spectralToXYZ, xyzToSrgb, rgbToCssRgb } from '@core/math/spectral';
import { xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const K = 1 / spectralToXYZ(() => 1).Y;
// peak wavelength from dot diameter (Å): smaller → bluer (confinement). Illustrative CdSe-like fit.
const peakOf = (dA: number) => 440 + (dA - 20) / 50 * 200; // 20Å→440nm, 70Å→640nm

class PanelQD {
  private stage: CanvasStage;
  private d = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 50);
    const s = document.getElementById('d') as EncSlider;
    s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0c0c12'; ctx.fillRect(0, 0, w, h);
    const peak = peakOf(this.d), fwhm = 24, sd = fwhm / 2.355;
    const qd = (l: number) => Math.exp(-0.5 * ((l - peak) / sd) ** 2);
    const oled = (l: number) => Math.exp(-0.5 * ((l - peak) / (50 / 2.355)) ** 2); // broad comparison

    const x0 = 50, y0 = 30, pw = w * 0.66, ph = h - 80;
    const lx = (l: number) => x0 + ((l - 400) / 300) * pw, py = (v: number) => y0 + ph - v * ph;
    ctx.strokeStyle = 'rgba(200,200,210,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + ph); ctx.lineTo(x0 + pw, y0 + ph); ctx.stroke();
    ctx.fillStyle = 'rgba(200,200,210,0.6)'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) ctx.fillText(String(l), lx(l), y0 + ph + 14);
    // broad OLED comparison (faint)
    ctx.strokeStyle = 'rgba(200,200,210,0.3)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath();
    for (let l = 400; l <= 700; l += 2) { const Y = py(oled(l)); l === 400 ? ctx.moveTo(lx(l), Y) : ctx.lineTo(lx(l), Y); } ctx.stroke(); ctx.setLineDash([]);
    // QD narrow peak (filled, coloured)
    ctx.fillStyle = xyToCss(...((): [number, number] => { const xyz = spectralToXYZ(qd); const s = xyz.X + xyz.Y + xyz.Z || 1e-9; return [xyz.X / s, xyz.Y / s]; })());
    ctx.beginPath(); ctx.moveTo(lx(400), py(0));
    for (let l = 400; l <= 700; l += 2) ctx.lineTo(lx(l), py(qd(l))); ctx.lineTo(lx(700), py(0)); ctx.closePath(); ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;

    // swatch
    const xyz = spectralToXYZ(qd); const css = rgbToCssRgb(xyzToSrgb({ X: xyz.X * K * 3, Y: xyz.Y * K * 3, Z: xyz.Z * K * 3 }));
    const bx = x0 + pw + 26;
    ctx.fillStyle = css; ctx.fillRect(bx, y0 + 10, w - bx - 30, 90); ctx.strokeStyle = 'rgba(200,200,210,0.4)'; ctx.strokeRect(bx, y0 + 10, w - bx - 30, 90);
    ctx.fillStyle = 'rgba(200,200,210,0.8)'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`peak ${peak.toFixed(0)} nm`, bx, y0 + 116); ctx.fillText(`FWHM ${fwhm} nm`, bx, y0 + 134); ctx.fillText(`${this.d} Å dot`, bx, y0 + 152);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('smaller dot → bluer, razor-narrow peak (dashed = broad OLED band for scale)', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new PanelQD());
