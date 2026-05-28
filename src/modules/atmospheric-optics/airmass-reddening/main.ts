import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { spectralToXYZ, xyzToSrgb, rgbToCssRgb } from '@core/math/spectral';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Kasten & Young (1989) revised relative optical airmass.
function airmass(elevationDeg: number): number {
  const h = Math.max(0, elevationDeg);
  return 1 / (Math.sin(h * DEG) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
}

// Rayleigh optical depth at sea level, normalised at 550 nm.
const TAU_550 = 0.0973;
function tauRayleigh(lambdaNm: number): number {
  return TAU_550 * Math.pow(550 / lambdaNm, 4);
}

class AirmassReddening {
  private stage: CanvasStage;
  private elev = 20;
  private turb = 1.0;
  private refY = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.elev = hydrateNumber('h', 20);
    this.turb = hydrateNumber('t', 1.0);
    (document.getElementById('h') as EncSlider).value = this.elev;
    (document.getElementById('t') as EncSlider).value = this.turb;
    registerStateParam('h', () => this.elev);
    registerStateParam('t', () => this.turb);
    // Calibrate reference luminance to the zenith sun (white).
    this.refY = this.transmittedXYZ(90, 1).Y || 1;
    for (const id of ['h', 't']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'h') this.elev = v; else this.turb = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.elev = 20; this.turb = 1.0;
      (document.getElementById('h') as EncSlider).value = 20;
      (document.getElementById('t') as EncSlider).value = 1.0;
      this.draw(); notifyStateChange();
    });
  }

  private transmittedXYZ(elevDeg: number, turb: number) {
    const X = airmass(elevDeg);
    return spectralToXYZ((lam) => Math.exp(-tauRayleigh(lam) * X * turb));
  }

  private sunColor(): { css: string; rgb: { r: number; g: number; b: number }; Y: number } {
    const xyz = this.transmittedXYZ(this.elev, this.turb);
    const scaled = { X: xyz.X / this.refY, Y: xyz.Y / this.refY, Z: xyz.Z / this.refY };
    const rgb = xyzToSrgb(scaled);
    return { css: rgbToCssRgb(rgb), rgb, Y: xyz.Y / this.refY };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const split = Math.floor(w * 0.52);
    this.drawSky(ctx, 0, 0, split, h);
    this.drawSpectrum(ctx, split, 0, w - split, h);
  }

  private drawSky(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    // Sky gradient — bluer when sun high, redder near horizon.
    const X = airmass(this.elev);
    const redness = Math.min(1, (X - 1) / 10);
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + h);
    grad.addColorStop(0, `rgb(${Math.round(60 + 120 * redness)}, ${Math.round(120 - 40 * redness)}, ${Math.round(200 - 120 * redness)})`);
    grad.addColorStop(0.7, `rgb(${Math.round(180 + 60 * redness)}, ${Math.round(150 - 40 * redness)}, ${Math.round(150 - 100 * redness)})`);
    grad.addColorStop(1, `rgb(${Math.round(220 * redness + 40)}, ${Math.round(90 - 30 * redness)}, ${Math.round(70 - 40 * redness)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, w, h);

    // Ground.
    const horizonY = y0 + h * 0.78;
    ctx.fillStyle = theme.inkAlpha(0.55);
    ctx.fillRect(x0, horizonY, w, y0 + h - horizonY);

    // Sun position from elevation: arc from horizon (0°) to zenith (90°).
    const cx = x0 + w * 0.5;
    const sunR = Math.min(w, h) * 0.10;
    const arcR = w * 0.36;
    const ang = this.elev * DEG;
    const sy = horizonY - Math.sin(ang) * arcR;
    const sunX = x0 + w * 0.30 + Math.cos(ang) * arcR * 0.6;

    const { css } = this.sunColor();
    // Soft glow.
    const glow = ctx.createRadialGradient(sunX, sy, sunR * 0.3, sunX, sy, sunR * 2.4);
    glow.addColorStop(0, css);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sunX, sy, sunR * 2.4, 0, 2 * Math.PI); ctx.fill();
    // Disk.
    ctx.fillStyle = css;
    ctx.beginPath(); ctx.arc(sunX, sy, sunR, 0, 2 * Math.PI); ctx.fill();

    // Path-length indicator (dashed line through atmosphere thickness).
    ctx.strokeStyle = 'rgba(248,242,228,0.6)';
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(sunX, sy); ctx.lineTo(cx, horizonY); ctx.stroke();
    ctx.setLineDash([]);

    // Readout.
    ctx.fillStyle = 'rgba(248,242,228,0.95)';
    ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`elevation = ${this.elev.toFixed(1)}°`, x0 + 14, y0 + 26);
    ctx.fillText(`airmass X = ${X.toFixed(2)}`, x0 + 14, y0 + 48);
  }

  private drawSpectrum(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    const pad = 40;
    const plotX = x0 + pad, plotY = y0 + pad;
    const plotW = w - pad * 1.5, plotH = h - pad * 2.4;
    const X = airmass(this.elev) * this.turb;
    const LMIN = 380, LMAX = 720;

    // Background visible band.
    const grad = ctx.createLinearGradient(plotX, 0, plotX + plotW, 0);
    grad.addColorStop(0.00, 'rgba(70,0,130,0.06)');
    grad.addColorStop(0.30, 'rgba(0,0,255,0.06)');
    grad.addColorStop(0.55, 'rgba(0,180,0,0.06)');
    grad.addColorStop(0.75, 'rgba(255,200,0,0.07)');
    grad.addColorStop(1.00, 'rgba(190,0,0,0.06)');
    ctx.fillStyle = grad; ctx.fillRect(plotX, plotY, plotW, plotH);

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (t: number) => plotY + (1 - t) * plotH;

    // Source (incident) at T=1.
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, yOf(1)); ctx.lineTo(plotX + plotW, yOf(1)); ctx.stroke();
    ctx.setLineDash([]);

    // Transmittance curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const l = LMIN + (LMAX - LMIN) * (i / 200);
      const T = Math.exp(-tauRayleigh(l) * X);
      const px = xOf(l), py = yOf(T);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Fill under curve faintly.
    ctx.lineTo(xOf(LMAX), yOf(0)); ctx.lineTo(xOf(LMIN), yOf(0)); ctx.closePath();
    ctx.fillStyle = theme.crimsonAlpha(0.08);
    ctx.fill();

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let l = 400; l <= 700; l += 100) ctx.fillText(`${l}`, xOf(l) - 10, plotY + plotH + 13);
    for (let t = 0; t <= 1; t += 0.25) ctx.fillText(t.toFixed(2), plotX - 30, yOf(t) + 3);

    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('λ (nm)', plotX + plotW * 0.45, plotY + plotH + 26);
    ctx.save(); ctx.translate(plotX - 32, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('transmittance T', -48, 0); ctx.restore();

    // Blue vs red transmittance readout.
    const Tblue = Math.exp(-tauRayleigh(450) * X);
    const Tred = Math.exp(-tauRayleigh(650) * X);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`T(450 nm) = ${(Tblue * 100).toFixed(0)}%`, plotX + 8, plotY + 16);
    ctx.fillText(`T(650 nm) = ${(Tred * 100).toFixed(0)}%`, plotX + 8, plotY + 34);
  }
}
window.addEventListener('DOMContentLoaded', () => new AirmassReddening());
