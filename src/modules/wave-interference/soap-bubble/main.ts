import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import {
  CMF_1931_2DEG,
  WAVELENGTH_STEP,
  thinFilmReflectance,
  spectralToXYZ,
  xyzToSrgb,
  rgbToCssHex,
  D65,
} from '@core/math/color-science';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * For each visible wavelength we compute thin-film reflectance and weight it by the
 * D65 illuminant CMF. Result is integrated to XYZ → sRGB.
 */
function reflectedColor(thickness: number, filmN: number): string {
  // D65 SPD approximated as flat 1.0 — for visualization purposes, the relative
  // shape of thin-film reflectance dominates. (A proper D65 SPD table would be a swap-in.)
  const R = (lambda: number) => thinFilmReflectance(lambda, thickness, filmN);
  const xyz = spectralToXYZ(R);
  // Normalize so peak luminance fits in display range
  const Yref = (CMF_1931_2DEG.reduce((s, r) => s + r.yBar, 0) * WAVELENGTH_STEP);
  const scale = 1.0 / Yref;
  const rgb = xyzToSrgb({ X: xyz.X * scale, Y: xyz.Y * scale, Z: xyz.Z * scale });

  // Optional: re-normalize so the brightest channel reaches 1 (perceptual)
  const m = Math.max(rgb.r, rgb.g, rgb.b);
  if (m > 0) {
    rgb.r = Math.min(1, rgb.r / m);
    rgb.g = Math.min(1, rgb.g / m);
    rgb.b = Math.min(1, rgb.b / m);
  }
  return rgbToCssHex(rgb);
}
void D65; // referenced for clarity; full D65 SPD swap-in is a follow-up

class SoapBubble {
  private stage: CanvasStage;
  private thickness = 350;
  private n = 1.33;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.thickness = hydrateNumber('d', 350);
    this.n = hydrateNumber('n', 1.33);
    (document.getElementById('thickness') as EncSlider).value = this.thickness;
    (document.getElementById('n') as EncSlider).value = this.n;

    registerStateParam('d', () => this.thickness);
    registerStateParam('n', () => this.n);

    this.bindSlider('thickness', (v) => (this.thickness = v));
    this.bindSlider('n', (v) => (this.n = v));

    document.addEventListener('reset-params', () => this.reset());
  }

  private bindSlider(id: string, set: (v: number) => void) {
    const el = document.getElementById(id) as EncSlider;
    el.addEventListener('input', () => {
      set(el.value);
      this.draw();
      notifyStateChange();
    });
    set(el.value);
  }

  private reset() {
    (document.getElementById('thickness') as EncSlider).value = 350;
    (document.getElementById('n') as EncSlider).value = 1.33;
    this.thickness = 350; this.n = 1.33;
    this.draw();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const color = reflectedColor(this.thickness, this.n);
    (document.getElementById('color-hex') as HTMLElement).textContent = color;
    (document.getElementById('color-swatch') as HTMLElement).style.background = color;

    // Bubble: a circle filled with the integrated reflectance color, plus a vertical
    // thickness gradient that demonstrates how variable thickness produces multiple bands.
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.4;

    // Paper background
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, w, h);

    // Soft drop shadow behind the bubble
    ctx.fillStyle = theme.inkAlpha(0.05);
    ctx.beginPath(); ctx.ellipse(cx + 4, cy + 6, r, r * 0.92, 0, 0, Math.PI * 2); ctx.fill();

    // Vertical thickness-gradient bubble
    const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    const stops = 24;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const d = Math.max(20, this.thickness * (1 + (t - 0.5) * 0.6));
      grad.addColorStop(t, reflectedColor(d, this.n));
    }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // Highlight (specular)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.45, r * 0.35, r * 0.2, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // Rim — ink
    ctx.strokeStyle = theme.inkAlpha(0.25);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    // Caption — gold italic
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`d = ${this.thickness} nm`, 16, 22);
    ctx.fillText(`n = ${this.n.toFixed(2)}`, 16, 40);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('Vertical gradient demonstrates thickness banding (±30%).', 16, h - 16);
  }
}

window.addEventListener('DOMContentLoaded', () => new SoapBubble());
