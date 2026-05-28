import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { D65, A, type WhitePoint } from '@core/math/illuminants';
import { bradfordAdapt, xyzFromLinearSrgb, linearSrgbFromXyz, srgbCss } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type V3 = [number, number, number];
// Surface reflectances as linear-sRGB (their daylight appearance).
const SWATCHES: Array<[string, V3]> = [
  ['grey', [0.6, 0.6, 0.6]],
  ['red', [0.55, 0.11, 0.09]],
  ['green', [0.12, 0.42, 0.16]],
  ['blue', [0.1, 0.18, 0.5]],
  ['yellow', [0.62, 0.5, 0.1]],
  ['skin', [0.72, 0.46, 0.36]],
];

class VonKries {
  private stage: CanvasStage;
  private warm = 70;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.warm = hydrateNumber('warm', 70);
    (document.getElementById('warm') as EncSlider).value = this.warm;
    registerStateParam('warm', () => this.warm);
    (document.getElementById('warm') as EncSlider).addEventListener('input', (e) => {
      this.warm = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.warm = 70;
      (document.getElementById('warm') as EncSlider).value = 70;
      this.draw(); notifyStateChange();
    });
  }

  private illuminant(): WhitePoint {
    const k = this.warm / 100;
    return { X: D65.X + (A.X - D65.X) * k, Y: 1, Z: D65.Z + (A.Z - D65.Z) * k };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(0, 0, w, h);

    const Ws = this.illuminant();
    const illumLin = linearSrgbFromXyz([Ws.X, Ws.Y, Ws.Z]);

    const n = SWATCHES.length;
    const pad = 40, gap = 10;
    const sw = (w - pad * 2 - gap * (n - 1)) / n;
    const sh = h * 0.26;
    const row1Y = 70, row2Y = row1Y + sh + 64;

    SWATCHES.forEach(([, rho], i) => {
      const x = pad + i * (sw + gap);
      const stimLin: V3 = [rho[0] * illumLin[0], rho[1] * illumLin[1], rho[2] * illumLin[2]];
      // Raw (unadapted) light reaching the eye.
      ctx.fillStyle = srgbCss(stimLin);
      ctx.fillRect(x, row1Y, sw, sh);
      // Bradford-adapted back to daylight.
      const adaptedXyz = bradfordAdapt(xyzFromLinearSrgb(stimLin), Ws, D65);
      ctx.fillStyle = srgbCss(linearSrgbFromXyz(adaptedXyz));
      ctx.fillRect(x, row2Y, sw, sh);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
      ctx.strokeRect(x, row1Y, sw, sh); ctx.strokeRect(x, row2Y, sw, sh);
    });

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('raw light reaching the eye — soaked in the lamp colour', pad, row1Y - 10);
    ctx.fillText('after Von Kries (Bradford) adaptation — the cast lifts', pad, row2Y - 10);

    const cct = Math.round(6500 - (this.warm / 100) * (6500 - 2856));
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`illuminant ≈ ${cct} K`, pad, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new VonKries());
