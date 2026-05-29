import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { SRGB, DISPLAY_P3, mul3, type V3 } from '@core/math/rgb-spaces';
import { srgbCss, linearSrgbFromXyz } from '@core/math/color-adaptation';
import { SPECTRAL_LOCUS } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function hueRgb(h: number): V3 {
  const x = 1 - Math.abs(((h / 60) % 2) - 1);
  const seg = Math.floor(h / 60) % 6;
  return [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][seg] as V3;
}
const xyOf = (xyz: V3): [number, number] => { const s = xyz[0] + xyz[1] + xyz[2] || 1e-9; return [xyz[0] / s, xyz[1] / s]; };

class CinemaLut {
  private stage: CanvasStage;
  private hue = 140;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 140);
    const s = document.getElementById('hue') as EncSlider;
    s.value = this.hue;
    s.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    document.addEventListener('reset-params', () => { this.hue = 140; s.value = 140; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const code = hueRgb(this.hue);
    const xyz709 = mul3(SRGB.toXyz, code), xyzP3 = mul3(DISPLAY_P3.toXyz, code);
    const css709 = srgbCss(linearSrgbFromXyz(xyz709)), cssP3 = srgbCss(linearSrgbFromXyz(xyzP3));

    // xy diagram
    const pad = 44, plotX = pad, plotY = 20, plotW = Math.min(w * 0.58, h * 0.95) , plotH = h - 60;
    const AMAX = 0.75, BMAX = 0.85, sc = Math.min(plotW / AMAX, plotH / BMAX);
    const px = (x: number) => plotX + x * sc, py = (y: number) => plotY + plotH - y * sc;
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.beginPath();
    SPECTRAL_LOCUS.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y)); }); ctx.closePath(); ctx.stroke();
    const tri = (sp: typeof SRGB, color: string) => { const { r, g, b } = sp.primaries; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px(r[0]), py(r[1])); ctx.lineTo(px(g[0]), py(g[1])); ctx.lineTo(px(b[0]), py(b[1])); ctx.closePath(); ctx.stroke(); };
    tri(SRGB, theme.slate); tri(DISPLAY_P3, theme.crimson);
    const [x7, y7] = xyOf(xyz709), [xp, yp] = xyOf(xyzP3);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px(x7), py(y7)); ctx.lineTo(px(xp), py(yp)); ctx.stroke(); ctx.setLineDash([]);
    const dot = (x: number, y: number, css: string, lbl: string) => { ctx.beginPath(); ctx.arc(px(x), py(y), 7, 0, Math.PI * 2); ctx.fillStyle = css; ctx.fill(); ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.fillText(lbl, px(x) + 9, py(y) - 5); };
    dot(x7, y7, css709, 'as 709'); dot(xp, yp, cssP3, 'as P3');

    // swatches
    const bx = plotX + plotW + 30, bw = w - bx - 30;
    ctx.fillStyle = css709; ctx.fillRect(bx, plotY + 10, bw, 80); ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(bx, plotY + 10, bw, 80);
    ctx.fillStyle = cssP3; ctx.fillRect(bx, plotY + 110, bw, 80); ctx.strokeRect(bx, plotY + 110, bw, 80);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('code read as Rec.709', bx, plotY + 104); ctx.fillText('same code read as Display P3', bx, plotY + 204);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText('one code, two colours — the gap is what a 709→P3 LUT rewrites', bx, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new CinemaLut());
