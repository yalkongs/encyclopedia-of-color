import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Monochromatic chromaticity per CMF wavelength (400–700nm).
const LOCUS = CMF_1931_2DEG.filter((r) => r.lambda >= 400 && r.lambda <= 700).map((r) => {
  const s = r.xBar + r.yBar + r.zBar || 1e-9;
  return { lambda: r.lambda, x: r.xBar / s, y: r.yBar / s };
});
function chromAt(wl: number) {
  let best = LOCUS[0];
  for (const p of LOCUS) if (Math.abs(p.lambda - wl) < Math.abs(best.lambda - wl)) best = p;
  return best;
}

class LocusShape {
  private stage: CanvasStage;
  private wl = 520;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.wl = hydrateNumber('wl', 520);
    const el = document.getElementById('wl') as EncSlider;
    el.value = this.wl;
    el.addEventListener('input', (e) => { this.wl = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('wl', () => Math.round(this.wl));
    document.addEventListener('reset-params', () => { this.wl = 520; el.value = 520; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const pad = 50, plotX = pad, plotY = 20, plotW = w - pad * 1.6, plotH = h - 60;
    const AMAX = 0.8, BMAX = 0.9;
    const s = Math.min(plotW / AMAX, plotH / BMAX);
    const px = (x: number) => plotX + x * s, py = (y: number) => plotY + plotH - y * s;

    // axes
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(AMAX), py(0)); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(0), py(BMAX)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('x', px(AMAX) - 8, py(0) + 16); ctx.fillText('y', px(0) - 16, py(BMAX));

    // line of purples (faint)
    const first = LOCUS[0], last = LOCUS[LOCUS.length - 1];
    ctx.strokeStyle = theme.inkAlpha(0.18); ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(last.x), py(last.y)); ctx.lineTo(px(first.x), py(first.y)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.inkHint; ctx.font = 'italic 10px Inter, sans-serif';
    ctx.fillText('line of purples', px((first.x + last.x) / 2) - 30, py((first.y + last.y) / 2) + 18);

    // full locus faint
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.lineWidth = 1;
    ctx.beginPath(); LOCUS.forEach((p, i) => { i === 0 ? ctx.moveTo(px(p.x), py(p.y)) : ctx.lineTo(px(p.x), py(p.y)); }); ctx.stroke();

    // traced portion (coloured by wavelength)
    for (let i = 1; i < LOCUS.length; i++) {
      if (LOCUS[i].lambda > this.wl) break;
      ctx.strokeStyle = xyToCss(LOCUS[i].x, LOCUS[i].y); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px(LOCUS[i - 1].x), py(LOCUS[i - 1].y)); ctx.lineTo(px(LOCUS[i].x), py(LOCUS[i].y)); ctx.stroke();
    }

    // current point
    const cur = chromAt(this.wl);
    ctx.beginPath(); ctx.arc(px(cur.x), py(cur.y), 7, 0, Math.PI * 2);
    ctx.fillStyle = xyToCss(cur.x, cur.y); ctx.fill(); ctx.strokeStyle = theme.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`${this.wl} nm  (x ${cur.x.toFixed(3)}, y ${cur.y.toFixed(3)})`, px(cur.x) + 12, py(cur.y) - 8);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('each pure wavelength is one boundary point — together they carve the horseshoe', plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new LocusShape());
