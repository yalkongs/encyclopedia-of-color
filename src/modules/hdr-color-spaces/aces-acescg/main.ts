import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { SPECTRAL_LOCUS, xyToCss } from '@core/math/colorimetry';
import { SRGB, BT2020 } from '@core/math/rgb-spaces';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type XY = [number, number];
const AP1: XY[] = [[0.713, 0.293], [0.165, 0.830], [0.128, 0.044]];
const AP0: XY[] = [[0.7347, 0.2653], [0.0, 1.0], [0.0001, -0.0770]];

function insideLocus(x: number, y: number): boolean {
  let inside = false;
  const L = SPECTRAL_LOCUS;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
    const [xi, yi] = L[i], [xj, yj] = L[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const triArea = (p: XY[]) => Math.abs((p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1])) / 2;

class AcesCg {
  private stage: CanvasStage;
  private space = 'ap1';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.space = hydrateFromUrl('space') ?? 'ap1';
    const t = document.getElementById('space') as EncToggle;
    t.value = this.space;
    t.addEventListener('change', (e) => { this.space = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('space', () => this.space);
    document.addEventListener('reset-params', () => { this.space = 'ap1'; t.value = 'ap1'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const ap = this.space === 'ap0' ? AP0 : AP1;

    const pad = 46, plotX = pad, plotY = 20;
    const AMAX = this.space === 'ap0' ? 0.85 : 0.78, BMAX = this.space === 'ap0' ? 1.05 : 0.86;
    const plotW = w - pad * 1.6, plotH = h - 66;
    const s = Math.min(plotW / AMAX, plotH / BMAX);
    const px = (x: number) => plotX + x * s, py = (y: number) => plotY + plotH - y * s;

    // filled locus
    const step = 3;
    for (let sy = 0; sy < plotH; sy += step) for (let sx = 0; sx < plotW; sx += step) {
      const x = sx / s, y = (plotH - sy) / s;
      if (!insideLocus(x, y)) continue;
      ctx.fillStyle = xyToCss(x, y);
      ctx.fillRect(plotX + sx, plotY + (plotH - sy) - step, step, step);
    }
    ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 1.1;
    ctx.beginPath(); SPECTRAL_LOCUS.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y)); }); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(AMAX), py(0)); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(0), py(BMAX)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('x', px(AMAX) - 8, py(0) + 16); ctx.fillText('y', px(0) - 16, py(BMAX) - 2);

    const tri = (p: XY[], color: string, lw: number, dash = false) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; if (dash) ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px(p[0][0]), py(p[0][1])); ctx.lineTo(px(p[1][0]), py(p[1][1])); ctx.lineTo(px(p[2][0]), py(p[2][1])); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    };
    tri([SRGB.primaries.r, SRGB.primaries.g, SRGB.primaries.b], theme.crimson, 1.4, true);
    tri([BT2020.primaries.r, BT2020.primaries.g, BT2020.primaries.b], theme.slate, 1.4, true);
    tri(ap, theme.ink, 2.4);
    for (const p of ap) { ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 4, 0, Math.PI * 2); ctx.fillStyle = theme.ink; ctx.fill(); }

    // legend
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = theme.crimson; ctx.fillRect(px(AMAX) - 96, plotY + 6, 14, 3); ctx.fillStyle = theme.inkMute; ctx.fillText('sRGB', px(AMAX) - 78, plotY + 10);
    ctx.fillStyle = theme.slate; ctx.fillRect(px(AMAX) - 96, plotY + 22, 14, 3); ctx.fillStyle = theme.inkMute; ctx.fillText('BT.2020', px(AMAX) - 78, plotY + 26);
    ctx.fillStyle = theme.ink; ctx.fillRect(px(AMAX) - 96, plotY + 38, 14, 3); ctx.fillStyle = theme.ink; ctx.fillText(this.space === 'ap0' ? 'AP0' : 'AP1', px(AMAX) - 78, plotY + 42);

    const ratio = triArea(ap) / triArea([BT2020.primaries.r, BT2020.primaries.g, BT2020.primaries.b]);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(this.space === 'ap0'
      ? 'AP0 — imaginary primaries enclose the entire visible locus (archival, lossless)'
      : `AP1 (ACEScg) — ${ratio.toFixed(2)}× the BT.2020 area, green primary just outside the locus`, plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new AcesCg());
