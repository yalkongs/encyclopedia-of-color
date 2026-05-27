import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import {
  spectralToXYZ,
  xyzToSrgb,
  rgbToCssHex,
  rayleighIntensity,
  DEG,
  CMF_1931_2DEG,
  WAVELENGTH_STEP,
} from '@core/math/color-science';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Air mass approximation: the ratio of the slant column of air traversed to the
 * vertical column. Uses the secant model with a small-elevation safety floor.
 */
function airMass(elevationDeg: number): number {
  const e = Math.max(0.5, elevationDeg); // floor to avoid div-by-zero at horizon
  return 1.0 / Math.sin(e * DEG);
}

/**
 * Attenuation of solar wavelength λ after traversing an air mass m
 * (Beer-Lambert with Rayleigh extinction).
 */
function transmittedSolar(lambdaNm: number, m: number): number {
  const tau550 = 0.12;                                // optical depth at 550 nm
  const tau = tau550 * rayleighIntensity(lambdaNm);   // ∝ 1/λ⁴
  return Math.exp(-tau * m);
}

/**
 * Sky color (scattered light away from the sun) — integrate scattered intensity
 * weighted by CMF. This is the Rayleigh-only sky model.
 */
function zenithSkyColor(m: number): string {
  const S = (lambda: number) => rayleighIntensity(lambda) * (1 - transmittedSolar(lambda, m));
  const xyz = spectralToXYZ(S);
  const yref = CMF_1931_2DEG.reduce((s, r) => s + r.yBar, 0) * WAVELENGTH_STEP;
  const scale = 1.0 / yref;
  let rgb = xyzToSrgb({ X: xyz.X * scale, Y: xyz.Y * scale, Z: xyz.Z * scale });
  const peak = Math.max(rgb.r, rgb.g, rgb.b);
  if (peak > 0) {
    rgb = { r: rgb.r / peak, g: rgb.g / peak, b: rgb.b / peak };
  }
  return rgbToCssHex(rgb);
}

/**
 * Sun-direction color — the spectrum that survives transmission to the eye.
 */
function sunColor(m: number): string {
  const S = (lambda: number) => transmittedSolar(lambda, m);
  const xyz = spectralToXYZ(S);
  const yref = CMF_1931_2DEG.reduce((s, r) => s + r.yBar, 0) * WAVELENGTH_STEP;
  const scale = 1.0 / yref;
  let rgb = xyzToSrgb({ X: xyz.X * scale, Y: xyz.Y * scale, Z: xyz.Z * scale });
  const peak = Math.max(rgb.r, rgb.g, rgb.b);
  if (peak > 0) {
    rgb = { r: rgb.r / peak, g: rgb.g / peak, b: rgb.b / peak };
  }
  return rgbToCssHex(rgb);
}

class SkyColor {
  private stage: CanvasStage;
  private elevation = 45;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.elevation = hydrateNumber('elev', 45);
    (document.getElementById('elevation') as EncSlider).value = this.elevation;
    registerStateParam('elev', () => Number(this.elevation.toFixed(1)));

    const el = document.getElementById('elevation') as EncSlider;
    el.addEventListener('input', () => {
      this.elevation = el.value;
      this.draw();
      notifyStateChange();
    });

    // Drag the sun directly on the canvas
    this.stage.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    (document.getElementById('elevation') as EncSlider).value = 45;
    this.elevation = 45;
    this.draw();
  }

  private onPointerDown(e: PointerEvent) {
    const dragging = (ev: PointerEvent) => {
      const rect = this.stage.canvas.getBoundingClientRect();
      const yLocal = (ev.clientY - rect.top) / rect.height;
      this.elevation = Math.max(-5, Math.min(90, (1 - yLocal) * 95 - 5));
      (document.getElementById('elevation') as EncSlider).value = this.elevation;
      this.draw();
      notifyStateChange();
    };
    dragging(e);
    const move = (ev: PointerEvent) => dragging(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;

    const m = airMass(this.elevation);
    const zenith = zenithSkyColor(m);
    const sun = sunColor(m);

    (document.getElementById('zenith-hex') as HTMLElement).textContent = zenith;
    (document.getElementById('sun-hex') as HTMLElement).textContent = sun;
    (document.getElementById('zenith-swatch') as HTMLElement).style.background = zenith;
    (document.getElementById('sun-swatch') as HTMLElement).style.background = sun;
    (document.getElementById('airmass-out') as HTMLElement).textContent = `${m.toFixed(2)} ×`;

    // Sky gradient: zenith at top, horizon brighter
    const horizonColor = sunColor(airMass(Math.max(0.5, this.elevation)) * 1.6);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, zenith);
    grad.addColorStop(0.7, mixHex(zenith, horizonColor, 0.4));
    grad.addColorStop(1, horizonColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ground silhouette — ink (deep navy-black sits well on any sky tone)
    const groundY = h * 0.85;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Sun position
    const sunX = w * 0.5;
    const sunY = h * (0.85 - 0.78 * Math.max(0, Math.min(1, (this.elevation + 5) / 95)));
    const sunR = 22;

    // Halo
    const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 4);
    halo.addColorStop(0, hexAlpha(sun, 0.6));
    halo.addColorStop(1, hexAlpha(sun, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 4, 0, Math.PI * 2); ctx.fill();

    // Sun disk
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.stroke();

    // Drag affordance — italic on top-left
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('drag the sun ↕', 14, 22);
  }
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function mixHex(a: string, b: string, t: number): string {
  const A = parseHex(a); const B = parseHex(b);
  const r = Math.round(A.r * (1 - t) + B.r * t);
  const g = Math.round(A.g * (1 - t) + B.g * t);
  const bl = Math.round(A.b * (1 - t) + B.b * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function hexAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

window.addEventListener('DOMContentLoaded', () => new SkyColor());
