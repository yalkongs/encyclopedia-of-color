import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { SPECTRAL_LOCUS, xyToCss } from '@core/math/colorimetry';
import { SRGB, BT2020, gamutTriangleArea, xyInGamut } from '@core/math/rgb-spaces';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const AREA_709 = gamutTriangleArea(SRGB), AREA_2020 = gamutTriangleArea(BT2020);

function insideLocus(x: number, y: number): boolean {
  let inside = false;
  const L = SPECTRAL_LOCUS;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
    const [xi, yi] = L[i], [xj, yj] = L[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

class Bt2020Vs709 {
  private stage: CanvasStage;
  private fill = 'gap';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.fill = hydrateFromUrl('fill') ?? 'gap';
    const t = document.getElementById('fill') as EncToggle;
    t.value = this.fill;
    t.addEventListener('change', (e) => { this.fill = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('fill', () => this.fill);
    document.addEventListener('reset-params', () => { this.fill = 'gap'; t.value = 'gap'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const pad = 46, plotX = pad, plotY = 20, plotW = w - pad * 1.6, plotH = h - 66;
    const AMAX = 0.75, BMAX = 0.85;
    const s = Math.min(plotW / AMAX, plotH / BMAX);
    const px = (x: number) => plotX + x * s, py = (y: number) => plotY + plotH - y * s;

    const step = 3;
    for (let sy = 0; sy < plotH; sy += step) {
      for (let sx = 0; sx < plotW; sx += step) {
        const x = sx / s, y = (plotH - sy) / s;
        if (!insideLocus(x, y)) continue;
        const in709 = xyInGamut(x, y, SRGB), in2020 = xyInGamut(x, y, BT2020);
        let lit = false;
        if (this.fill === 'rec709') lit = in709;
        else if (this.fill === 'bt2020') lit = in2020;
        else lit = in2020 && !in709;
        ctx.fillStyle = lit ? xyToCss(x, y) : theme.inkAlpha(0.05);
        ctx.fillRect(plotX + sx, plotY + (plotH - sy) - step, step, step);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); SPECTRAL_LOCUS.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y)); }); ctx.closePath(); ctx.stroke();

    const tri = (sp: typeof SRGB, color: string, lw: number) => {
      const { r, g, b } = sp.primaries;
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(px(r[0]), py(r[1])); ctx.lineTo(px(g[0]), py(g[1])); ctx.lineTo(px(b[0]), py(b[1])); ctx.closePath(); ctx.stroke();
    };
    tri(BT2020, theme.ink, 2);
    tri(SRGB, theme.crimson, 2);

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(AMAX), py(0)); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(0), py(BMAX)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('x', px(AMAX) - 8, py(0) + 16); ctx.fillText('y', px(0) - 16, py(BMAX));

    // legend
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = theme.crimson; ctx.fillRect(px(AMAX) - 96, plotY + 6, 14, 3);
    ctx.fillStyle = theme.inkMute; ctx.fillText('Rec.709', px(AMAX) - 78, plotY + 10);
    ctx.fillStyle = theme.ink; ctx.fillRect(px(AMAX) - 96, plotY + 22, 14, 3);
    ctx.fillText('BT.2020', px(AMAX) - 78, plotY + 26);

    const cov = (AREA_709 / AREA_2020) * 100;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`Rec.709 covers ${cov.toFixed(0)}% of the BT.2020 chromaticity area — the gap is the wide-gamut bonus`, plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Bt2020Vs709());
