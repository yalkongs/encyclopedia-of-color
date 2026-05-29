import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { xyzToLab, labToXyz } from '@core/math/colorimetry';
import { linSrgbToOklab, oklabToLinSrgb, srgbToLinear } from '@core/math/oklab';
import { xyzFromLinearSrgb, linearSrgbFromXyz, srgbCss } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type V3 = [number, number, number];

// HSL(h,100%,50%) → sRGB (0..1), a clean fully-saturated hue endpoint.
function hueRgb(h: number): V3 {
  const c = 1, x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const seg = Math.floor(h / 60) % 6;
  const t: V3 = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg] as V3;
  return t;
}
const lin = (rgb: V3): V3 => rgb.map(srgbToLinear) as V3;
const labHue = (a: number, b: number) => { let h = (Math.atan2(b, a) * 180) / Math.PI; return h < 0 ? h + 360 : h; };

class OklabLinearity {
  private stage: CanvasStage;
  private hue = 264;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 264);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => Math.round(this.hue));
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 264; (document.getElementById('hue') as EncSlider).value = 264; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const endRgb = hueRgb(this.hue);
    const endLin = lin(endRgb);
    const labEnd = xyzToLab(xyzFromLinearSrgb(endLin));
    const okEnd = linSrgbToOklab(endLin);
    const whiteLab: V3 = [100, 0, 0];
    const okWhite: V3 = linSrgbToOklab([1, 1, 1]);

    const pad = 48, plotW = w - pad * 1.6, x0 = pad;
    const stripH = Math.min(64, (h - 150) / 2);
    const gap = 40;
    const y1 = 60, y2 = y1 + stripH + gap;

    const drawStrip = (y: number, interp: (t: number) => string, title: string, midHue: number) => {
      for (let sx = 0; sx < plotW; sx++) {
        const t = sx / (plotW - 1);
        ctx.fillStyle = interp(t);
        ctx.fillRect(x0 + sx, y, 1, stripH);
      }
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
      ctx.strokeRect(x0, y, plotW, stripH);
      // midpoint marker
      const mx = x0 + plotW * 0.5;
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx, y - 6); ctx.lineTo(mx, y + stripH + 6); ctx.stroke();
      ctx.fillStyle = theme.inkSoft; ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText(title, x0, y - 10);
      const dev = Math.abs(((midHue - this.hue + 540) % 360) - 180);
      ctx.fillStyle = dev > 8 ? theme.crimson : theme.goldDeep;
      ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`midpoint hue ${midHue.toFixed(0)}°  (Δ ${dev.toFixed(0)}°)`, x0 + plotW, y - 10);
      ctx.textAlign = 'left';
    };

    // CIELAB strip
    const labMid = labEnd.map((v, i) => (v + whiteLab[i]) / 2) as V3;
    drawStrip(y1, (t) => {
      const L = labEnd.map((v, i) => v + (whiteLab[i] - v) * t) as V3;
      return srgbCss(linearSrgbFromXyz(labToXyz(L)));
    }, 'CIELAB  L*a*b* interpolation', labHue(labMid[1], labMid[2]));

    // OKLab strip
    const okMid = okEnd.map((v, i) => (v + okWhite[i]) / 2) as V3;
    drawStrip(y2, (t) => {
      const L = okEnd.map((v, i) => v + (okWhite[i] - v) * t) as V3;
      return srgbCss(oklabToLinSrgb(L));
    }, 'OKLab  interpolation', labHue(okMid[1], okMid[2]));

    // endpoint swatch + caption
    ctx.fillStyle = srgbCss(endLin);
    ctx.fillRect(x0, y2 + stripH + 24, 26, 26);
    ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(x0, y2 + stripH + 24, 26, 26);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`endpoint hue ${this.hue.toFixed(0)}° → white · faithful spaces keep the midpoint hue unchanged`, x0 + 36, y2 + stripH + 42);
  }
}
window.addEventListener('DOMContentLoaded', () => new OklabLinearity());
