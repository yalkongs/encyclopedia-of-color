import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { SPECTRAL_LOCUS } from '@core/math/colorimetry';
import { linearSrgbFromXyz, srgb8 } from '@core/math/color-adaptation';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

function xyTuple(x: number, y: number): [number, number, number] {
  if (y <= 1e-4) return [0, 0, 0];
  const lin = linearSrgbFromXyz([x / y, 1, (1 - x - y) / y]);
  const m = Math.max(lin[0], lin[1], lin[2], 1e-6);
  return srgb8([lin[0] / m, lin[1] / m, lin[2] / m]);
}

// Locus in u'v'.
const LOCUS_UV = SPECTRAL_LOCUS.map(([x, y]) => {
  const d = -2 * x + 12 * y + 3;
  return [(4 * x) / d, (9 * y) / d] as [number, number];
});
function uvToXy(u: number, v: number): [number, number] {
  const d = 6 * u - 16 * v + 12;
  return [(9 * u) / d, (4 * v) / d];
}
function pointInPoly(px: number, py: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

class Ucs1976 {
  private stage: CanvasStage;
  private space = 'uv';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.space = hydrateFromUrl('space') ?? 'uv';
    (document.getElementById('space') as EncToggle).value = this.space;
    registerStateParam('space', () => this.space);
    (document.getElementById('space') as EncToggle).addEventListener('change', (e) => {
      this.space = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.space = 'uv';
      (document.getElementById('space') as EncToggle).value = 'uv';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const uv = this.space === 'uv';
    const AMAX = uv ? 0.65 : 0.75, BMAX = uv ? 0.62 : 0.85;
    const locus = uv ? LOCUS_UV : SPECTRAL_LOCUS;

    const pad = 50, plotX = pad, plotY = 26, plotW = w - pad * 1.5, plotH = h - 70;
    const s = Math.min(plotW / AMAX, plotH / BMAX);
    const px = (a: number) => plotX + a * s, py = (b: number) => plotY + plotH - b * s;

    fillRegionAA(ctx, plotX, plotY, plotX + plotW, plotY + plotH, (sxp, syp) => {
      const a = (sxp - plotX) / s, b = (plotY + plotH - syp) / s;
      if (!pointInPoly(a, b, locus)) return null;
      const [cx, cy] = uv ? uvToXy(a, b) : [a, b];
      return xyTuple(cx, cy);
    });
    ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 1.2;
    ctx.beginPath(); locus.forEach(([a, b], i) => { const X = px(a), Y = py(b); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX, plotY); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX + AMAX * s, py(0)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(uv ? "u'" : 'x', px(AMAX) - 10, py(0) + 16); ctx.fillText(uv ? "v'" : 'y', plotX - 16, plotY + 6);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(uv ? "1976 u'v' — perceptually fairer spacing" : '1931 xy — green compressed, blue exaggerated', plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Ucs1976());
