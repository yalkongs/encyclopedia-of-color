import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { SPECTRAL_LOCUS } from '@core/math/colorimetry';
import { SRGB, ADOBE_RGB, DISPLAY_P3, BT2020, gamutTriangleArea, type RgbSpace } from '@core/math/rgb-spaces';
import { linearSrgbFromXyz, srgb8 } from '@core/math/color-adaptation';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const SPACES: Record<string, RgbSpace> = { srgb: SRGB, adobe: ADOBE_RGB, p3: DISPLAY_P3, bt2020: BT2020 };
const COLORS: Record<string, string> = { srgb: theme.crimson, adobe: theme.slate, p3: theme.goldDeep, bt2020: theme.ink };
const AREA2020 = gamutTriangleArea(BT2020);

class GamutOverlap {
  private stage: CanvasStage;
  private space = 'srgb';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.space = hydrateFromUrl('space') ?? 'srgb';
    const t = document.getElementById('space') as EncToggle;
    t.value = this.space;
    t.addEventListener('change', (e) => { this.space = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('space', () => this.space);
    document.addEventListener('reset-params', () => { this.space = 'srgb'; t.value = 'srgb'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const pad = 46, plotX = pad, plotY = 20, plotW = w - pad * 1.6, plotH = h - 66;
    const AMAX = 0.75, BMAX = 0.85;
    const s = Math.min(plotW / AMAX, plotH / BMAX);
    const px = (x: number) => plotX + x * s;
    const py = (y: number) => plotY + plotH - y * s;

    // filled locus (subsample anti-aliased boundary)
    fillRegionAA(ctx, plotX, plotY, plotX + plotW, plotY + plotH, (sxp, syp) => {
      const x = (sxp - plotX) / s, y = (plotY + plotH - syp) / s;
      return insideLocus(x, y) ? xyTuple(x, y) : null;
    });
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.1;
    ctx.beginPath(); SPECTRAL_LOCUS.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y)); }); ctx.closePath(); ctx.stroke();

    // axes
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(AMAX), py(0)); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(0), py(BMAX)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('x', px(AMAX) - 8, py(0) + 16); ctx.fillText('y', px(0) - 16, py(BMAX));

    // triangles — others thin, highlighted thick + filled outline + primaries
    for (const key of ['bt2020', 'p3', 'adobe', 'srgb']) {
      if (key === this.space) continue;
      this.triangle(ctx, SPACES[key], px, py, COLORS[key], 1, false);
    }
    this.triangle(ctx, SPACES[this.space], px, py, COLORS[this.space], 2.4, true);

    // legend
    let ly = plotY + 6;
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    for (const key of ['srgb', 'adobe', 'p3', 'bt2020']) {
      ctx.fillStyle = COLORS[key];
      ctx.fillRect(px(AMAX) - 96, ly, 14, 3);
      ctx.fillStyle = key === this.space ? theme.ink : theme.inkMute;
      ctx.font = `${key === this.space ? '600 ' : ''}11px Inter, sans-serif`;
      ctx.fillText(SPACES[key].name.split(' ')[0], px(AMAX) - 78, ly + 4);
      ly += 16;
    }

    const cov = (gamutTriangleArea(SPACES[this.space]) / AREA2020) * 100;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${SPACES[this.space].name} — chromaticity area ${cov.toFixed(0)}% of BT.2020`, plotX, h - 12);
  }

  private triangle(ctx: CanvasRenderingContext2D, sp: RgbSpace, px: (x: number) => number, py: (y: number) => number, color: string, lw: number, hi: boolean) {
    const { r, g, b } = sp.primaries;
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    if (hi) { ctx.fillStyle = theme.inkAlpha(0.04); }
    ctx.beginPath();
    ctx.moveTo(px(r[0]), py(r[1])); ctx.lineTo(px(g[0]), py(g[1])); ctx.lineTo(px(b[0]), py(b[1])); ctx.closePath();
    if (hi) ctx.fill();
    ctx.stroke();
    if (hi) for (const p of [r, g, b]) {
      ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    }
  }
}

function xyTuple(x: number, y: number): [number, number, number] {
  if (y <= 1e-4) return [0, 0, 0];
  const lin = linearSrgbFromXyz([x / y, 1, (1 - x - y) / y]);
  const m = Math.max(lin[0], lin[1], lin[2], 1e-6);
  return srgb8([lin[0] / m, lin[1] / m, lin[2] / m]);
}

function insideLocus(x: number, y: number): boolean {
  let inside = false;
  const L = SPECTRAL_LOCUS;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
    const [xi, yi] = L[i], [xj, yj] = L[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

window.addEventListener('DOMContentLoaded', () => new GamutOverlap());
