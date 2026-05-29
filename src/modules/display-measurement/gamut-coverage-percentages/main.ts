import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';
import { SRGB, ADOBE_RGB, DISPLAY_P3, BT2020, type RgbSpace } from '@core/math/rgb-spaces';

type Pt = [number, number];
const X1 = 0.75, Y1 = 0.85;

const REFS: { key: string; label: string; space: RgbSpace }[] = [
  { key: 'srgb', label: 'sRGB', space: SRGB },
  { key: 'adobe', label: 'Adobe RGB', space: ADOBE_RGB },
  { key: 'p3', label: 'DCI / Display P3', space: DISPLAY_P3 },
  { key: 'rec2020', label: 'Rec. 2020', space: BT2020 },
];

const triPts = (s: RgbSpace): Pt[] => [s.primaries.r as Pt, s.primaries.g as Pt, s.primaries.b as Pt];
function shoelace(poly: Pt[]): number { let a = 0; for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; a += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; } return Math.abs(a) / 2; }
// Sutherland-Hodgman: clip subject polygon by convex clip polygon
function clip(subject: Pt[], clipPoly: Pt[]): Pt[] {
  let out = subject;
  for (let i = 0; i < clipPoly.length; i++) {
    const a = clipPoly[i], b = clipPoly[(i + 1) % clipPoly.length];
    const inside = (p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-9;
    const inter = (p: Pt, q: Pt): Pt => {
      const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const t = d1 / (d1 - d2); return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const input = out; out = [];
    for (let j = 0; j < input.length; j++) {
      const cur = input[j], prev = input[(j + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(inter(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(inter(prev, cur));
    }
    if (out.length === 0) break;
  }
  return out;
}

class Coverage {
  private stage: CanvasStage;
  private width = 55;
  private ref = 'p3';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.width = hydrateNumber('width', 55);
    this.ref = hydrateFromUrl('ref') ?? 'p3';
    const s = document.getElementById('width') as EncSlider;
    s.value = this.width;
    s.addEventListener('input', (e) => { this.width = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('width', () => Math.round(this.width));
    const t = document.getElementById('ref') as EncToggle;
    t.value = this.ref;
    t.addEventListener('change', (e) => { this.ref = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ref', () => this.ref);
    document.addEventListener('reset-params', () => { this.width = 55; this.ref = 'p3'; s.value = 55; t.value = 'p3'; this.draw(); notifyStateChange(); });
  }

  // display triangle: interpolate sRGB → Rec.2020 primaries by t
  private displayTri(): Pt[] {
    const t = this.width / 100;
    const lerp = (a: Pt, b: Pt): Pt => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    return [lerp(SRGB.primaries.r as Pt, BT2020.primaries.r as Pt), lerp(SRGB.primaries.g as Pt, BT2020.primaries.g as Pt), lerp(SRGB.primaries.b as Pt, BT2020.primaries.b as Pt)];
  }
  private coverage(disp: Pt[], ref: Pt[]): number {
    const inter = clip(disp, ref);
    if (inter.length < 3) return 0;
    return Math.min(1, shoelace(inter) / shoelace(ref));
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 56, gy = 30, gw = Math.min(w - 360, h * 0.92), gh = h - 96;
    const X = (x: number) => gx + (x / X1) * gw;
    const Y = (y: number) => gy + gh - (y / Y1) * gh;
    const disp = this.displayTri();

    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    const drawTri = (pts: Pt[], stroke: string, lw: number, fill: string | null, dash: number[] = []) => {
      ctx.save(); ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1])); ctx.lineTo(X(pts[1][0]), Y(pts[1][1])); ctx.lineTo(X(pts[2][0]), Y(pts[2][1])); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); ctx.restore();
    };
    const refSpace = REFS.find((r) => r.key === this.ref)!.space;
    drawTri(triPts(refSpace), theme.gold, 2, 'rgba(176,140,40,0.10)');
    drawTri(disp, theme.crimson, 2.2, 'rgba(176,57,47,0.14)');
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CIE x', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 38, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('CIE y', 0, 0); ctx.restore();
    const lx = gx + 12; let ly = gy + 16;
    const lk = (c: string, t: string) => { ctx.fillStyle = c; ctx.fillRect(lx, ly - 8, 14, 4); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(t, lx + 20, ly - 2); ly += 17; };
    lk(theme.crimson, 'this display'); lk(theme.gold, REFS.find((r) => r.key === this.ref)!.label);

    // coverage bars (right)
    const bx = gx + gw + 60, bw = w - bx - 60, by = gy + 20, bh = (gh - 40) / REFS.length;
    REFS.forEach((r, i) => {
      const cov = this.coverage(disp, triPts(r.space));
      const y = by + i * bh;
      ctx.fillStyle = theme.inkAlpha(0.08); ctx.fillRect(bx, y, bw, bh * 0.5);
      ctx.fillStyle = r.key === this.ref ? theme.crimson : theme.slate; ctx.fillRect(bx, y, bw * cov, bh * 0.5);
      ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${r.label}`, bx, y - 4);
      ctx.textAlign = 'right'; ctx.fillStyle = theme.inkSoft; ctx.fillText(`${Math.round(cov * 100)}%`, bx + bw, y - 4);
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('coverage = overlap ÷ reference area — a bigger display still may not reach every corner', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Coverage());
