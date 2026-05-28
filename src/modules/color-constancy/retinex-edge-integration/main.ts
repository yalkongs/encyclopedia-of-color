import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { srgbCss } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type V3 = [number, number, number];
const COLS = 5, ROWS = 4;
// Fixed Mondrian reflectances (linear-sRGB).
const PATCHES: V3[] = [
  [0.62, 0.10, 0.08], [0.80, 0.70, 0.12], [0.10, 0.22, 0.52], [0.72, 0.72, 0.70], [0.12, 0.40, 0.18],
  [0.78, 0.74, 0.66], [0.15, 0.30, 0.55], [0.66, 0.14, 0.10], [0.20, 0.46, 0.22], [0.82, 0.66, 0.14],
  [0.18, 0.20, 0.24], [0.74, 0.32, 0.10], [0.60, 0.62, 0.60], [0.10, 0.34, 0.50], [0.70, 0.16, 0.34],
  [0.84, 0.78, 0.70], [0.22, 0.44, 0.20], [0.78, 0.68, 0.16], [0.14, 0.24, 0.46], [0.55, 0.12, 0.10],
];

class Retinex {
  private stage: CanvasStage;
  private grad = 55;
  private mode = 'raw';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.grad = hydrateNumber('grad', 55);
    this.mode = hydrateFromUrl('mode') ?? 'raw';
    (document.getElementById('grad') as EncSlider).value = this.grad;
    (document.getElementById('mode') as EncToggle).value = this.mode;
    registerStateParam('grad', () => this.grad);
    registerStateParam('mode', () => this.mode);
    (document.getElementById('grad') as EncSlider).addEventListener('input', (e) => {
      this.grad = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('mode') as EncToggle).addEventListener('change', (e) => {
      this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.grad = 55; this.mode = 'raw';
      (document.getElementById('grad') as EncSlider).value = 55;
      (document.getElementById('mode') as EncToggle).value = 'raw';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const pad = 40, gy = 60;
    const gw = w - pad * 2, gh = h * 0.6;
    const cw = gw / COLS, ch = gh / ROWS;
    const k = this.grad / 100;
    const retinex = this.mode === 'retinex';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ref = PATCHES[r * COLS + c];
        const xn = (c + 0.5) / COLS;
        const illum = retinex ? 1 : Math.max(0.12, 1 + k * (xn - 0.5) * 2);
        const lin: V3 = [ref[0] * illum, ref[1] * illum, ref[2] * illum];
        ctx.fillStyle = srgbCss(lin);
        ctx.fillRect(pad + c * cw, gy + r * ch, cw + 0.5, ch + 0.5);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(pad, gy, gw, gh);

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(retinex ? 'retinex output — illumination integrated out, reflectance restored' : 'raw light — an illumination gradient tilts every patch', pad, gy - 12);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`gradient ${this.grad}%   ·   ${retinex ? 'edges trusted, gradient discarded' : 'left in shadow, right in light'}`, pad, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Retinex());
