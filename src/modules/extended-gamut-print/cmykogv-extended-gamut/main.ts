import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { SPECTRAL_LOCUS } from '@core/math/colorimetry';
import { linearSrgbFromXyz, srgb8 } from '@core/math/color-adaptation';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Pt = [number, number];
const WHITE: Pt = [0.31, 0.33];
// illustrative ink chromaticities (xy)
const CMYK_PTS: Pt[] = [[0.16, 0.30], [0.20, 0.18], [0.46, 0.24], [0.55, 0.34], [0.42, 0.50], [0.20, 0.55]];
const OGV_PTS: Pt[] = [[0.16, 0.30], [0.21, 0.12], [0.46, 0.24], [0.58, 0.40], [0.42, 0.50], [0.18, 0.62]];
const X1 = 0.75, Y1 = 0.85;

function sortHull(pts: Pt[]): Pt[] {
  return [...pts].sort((a, b) => Math.atan2(a[1] - WHITE[1], a[0] - WHITE[0]) - Math.atan2(b[1] - WHITE[1], b[0] - WHITE[0]));
}
function shoelace(poly: Pt[]): number { let a = 0; for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; a += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; } return Math.abs(a) / 2; }
function pointInPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function insideLocus(x: number, y: number): boolean { return pointInPoly(x, y, SPECTRAL_LOCUS as Pt[]); }
function xyTuple(x: number, y: number): [number, number, number] {
  if (y <= 1e-4) return [0, 0, 0];
  const lin = linearSrgbFromXyz([x / y, 1, (1 - x - y) / y]);
  const m = Math.max(lin[0], lin[1], lin[2], 1e-6);
  return srgb8([lin[0] / m, lin[1] / m, lin[2] / m]);
}

class ExtendedGamut {
  private stage: CanvasStage;
  private gamut = 'cmyk';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.gamut = hydrateFromUrl('gamut') ?? 'cmyk';
    const t = document.getElementById('gamut') as EncToggle;
    t.value = this.gamut;
    t.addEventListener('change', (e) => { this.gamut = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('gamut', () => this.gamut);
    document.addEventListener('reset-params', () => { this.gamut = 'cmyk'; t.value = 'cmyk'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 56, gy = 26, gw = Math.min(w - 320, h * 0.95), gh = h - 80;
    const X = (x: number) => gx + (x / X1) * gw, Y = (y: number) => gy + gh - (y / Y1) * gh;
    const poly = sortHull(this.gamut === 'cmyk' ? CMYK_PTS : OGV_PTS);

    // locus fill: in-gamut colours saturated, out-of-gamut greyed
    fillRegionAA(ctx, gx, gy, gx + gw, gy + gh, (sxp, syp) => {
      const x = (sxp - gx) / gw * X1, y = (gy + gh - syp) / gh * Y1;
      if (!insideLocus(x, y)) return null;
      const [r, g, b] = xyTuple(x, y);
      if (pointInPoly(x, y, poly)) return [r, g, b];
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;        // desaturate outside the gamut
      return [r * 0.25 + lum * 0.6, g * 0.25 + lum * 0.6, b * 0.25 + lum * 0.6];
    });

    // locus outline
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.1; ctx.beginPath();
    (SPECTRAL_LOCUS as Pt[]).forEach((p, i) => { i === 0 ? ctx.moveTo(X(p[0]), Y(p[1])) : ctx.lineTo(X(p[0]), Y(p[1])); }); ctx.closePath(); ctx.stroke();

    // both polygons: inactive faint, active bold
    const drawPoly = (pts: Pt[], col: string, lw: number, dash: number[]) => {
      const sp = sortHull(pts);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
      sp.forEach((p, i) => { i === 0 ? ctx.moveTo(X(p[0]), Y(p[1])) : ctx.lineTo(X(p[0]), Y(p[1])); }); ctx.closePath(); ctx.stroke(); ctx.restore();
    };
    if (this.gamut === 'cmyk') { drawPoly(OGV_PTS, theme.inkAlpha(0.3), 1, [4, 4]); drawPoly(CMYK_PTS, theme.crimson, 2.4, []); }
    else { drawPoly(CMYK_PTS, theme.inkAlpha(0.3), 1, [4, 4]); drawPoly(OGV_PTS, theme.crimson, 2.4, []); }
    for (const p of poly) { ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 3.5, 0, Math.PI * 2); ctx.fill(); }

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CIE x', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 38, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('CIE y', 0, 0); ctx.restore();

    const aC = shoelace(sortHull(CMYK_PTS)), aE = shoelace(sortHull(OGV_PTS));
    const gain = ((aE - aC) / aC) * 100;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.gamut === 'cmyk'
      ? 'CMYK — the four-colour hexagon; greens, oranges, and violets fall outside'
      : `CMYKOGV — the polygon bulges out, about +${Math.round(gain)}% chromaticity area over CMYK`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ExtendedGamut());
