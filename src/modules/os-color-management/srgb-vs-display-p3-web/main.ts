import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { SRGB, DISPLAY_P3 } from '@core/math/rgb-spaces';

const X0 = 0, X1 = 0.75, Y0 = 0, Y1 = 0.85;

class P3Web {
  private stage: CanvasStage;
  private prim = 'red';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.prim = hydrateFromUrl('prim') ?? 'red';
    const t = document.getElementById('prim') as EncToggle;
    t.value = this.prim;
    t.addEventListener('change', (e) => { this.prim = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('prim', () => this.prim);
    document.addEventListener('reset-params', () => { this.prim = 'red'; t.value = 'red'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 60, gy = 30, gw = Math.min(w - 320, h * 0.9), gh = h - 96;
    const X = (x: number) => gx + ((x - X0) / (X1 - X0)) * gw;
    const Y = (y: number) => gy + gh - ((y - Y0) / (Y1 - Y0)) * gh;

    // axes
    ctx.strokeStyle = theme.inkAlpha(0.15); ctx.lineWidth = 1;
    for (let i = 0; i <= 7; i++) { const xx = gx + (i / 7) * gw; ctx.beginPath(); ctx.moveTo(xx, gy); ctx.lineTo(xx, gy + gh); ctx.stroke(); }
    for (let i = 0; i <= 8; i++) { const yy = gy + (i / 8) * gh; ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke(); }
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.strokeRect(gx, gy, gw, gh);

    const tri = (s: typeof SRGB, stroke: string, fill: string | null) => {
      const p = s.primaries;
      ctx.beginPath(); ctx.moveTo(X(p.r[0]), Y(p.r[1])); ctx.lineTo(X(p.g[0]), Y(p.g[1])); ctx.lineTo(X(p.b[0]), Y(p.b[1])); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    };
    tri(DISPLAY_P3, theme.crimson, 'rgba(176,57,47,0.10)');
    tri(SRGB, theme.gold, 'rgba(176,140,40,0.10)');

    // highlight a primary: marker on both, line between
    const key = this.prim as 'red' | 'green' | 'blue';
    const map = { red: 'r', green: 'g', blue: 'b' } as const;
    const ps = SRGB.primaries[map[key]], pp = DISPLAY_P3.primaries[map[key]];
    ctx.strokeStyle = theme.slate; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(ps[0]), Y(ps[1])); ctx.lineTo(X(pp[0]), Y(pp[1])); ctx.stroke(); ctx.setLineDash([]);
    const dot = (p: number[], col: string) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 5, 0, Math.PI * 2); ctx.fill(); };
    dot(ps, theme.gold); dot(pp, theme.crimson);

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CIE x', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 40, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('CIE y', 0, 0); ctx.restore();
    // legend
    const lx = gx + gw - 130; let ly = gy + 16;
    const lk = (c: string, t: string) => { ctx.fillStyle = c; ctx.fillRect(lx, ly - 8, 14, 4); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(t, lx + 20, ly - 2); ly += 17; };
    lk(theme.crimson, 'Display P3'); lk(theme.gold, 'sRGB');

    // swatch comparison panel (right)
    const sx = gx + gw + 36, sw = w - sx - 40;
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    const SW: Record<string, [string, string, string]> = {
      red: ['#ff0000', 'color(display-p3 1 0 0)', 'rgb(255,0,0)'],
      green: ['#00ff00', 'color(display-p3 0 1 0)', 'rgb(0,255,0)'],
      blue: ['#0000ff', 'color(display-p3 0 0 1)', 'rgb(0,0,255)'],
    };
    const [hex, p3css, fill] = SW[key];
    let yy = gy + 16;
    ctx.fillText('sRGB  ' + hex, sx, yy); yy += 8;
    ctx.fillStyle = fill; ctx.fillRect(sx, yy, sw, 80); yy += 100;
    ctx.fillStyle = theme.ink; ctx.fillText('P3  ' + p3css, sx, yy); yy += 8;
    ctx.fillStyle = fill; ctx.fillRect(sx, yy, sw, 80);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('(P3 swatch clamped to your screen)', sx, yy + 98);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('the dashed line is gamut the web gained — P3 reaches primaries sRGB cannot name', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new P3Web());
