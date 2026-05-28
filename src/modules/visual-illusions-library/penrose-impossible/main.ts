import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const A = 0.866;
const L = 3.4, W = 1;
const TOP = '#cdb886', XF = '#9c8552', YF = '#6f5d38';

class Penrose {
  private stage: CanvasStage;
  private expose = 'solid';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.expose = hydrateFromUrl('expose') ?? 'solid';
    (document.getElementById('expose') as EncToggle).value = this.expose;
    registerStateParam('expose', () => this.expose);
    (document.getElementById('expose') as EncToggle).addEventListener('change', (e) => {
      this.expose = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.expose = 'solid';
      (document.getElementById('expose') as EncToggle).value = 'solid';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const s = Math.min(w, h) * 0.13;
    const cx = w * 0.5 - A * L * 0.5 * s, cy = h * 0.5 - 0.5 * L * s;
    const iso = (x: number, y: number, z: number): [number, number] => [cx + (x - y) * A * s, cy + (x + y) * 0.5 * s - z * s];

    const box = (ox: number, oy: number, oz: number, sx: number, sy: number, sz: number) => {
      const face = (pts: Array<[number, number, number]>, fill: string) => {
        ctx.beginPath();
        pts.forEach((p, i) => { const [X, Y] = iso(p[0], p[1], p[2]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 1.5; ctx.stroke();
      };
      face([[ox, oy, oz + sz], [ox + sx, oy, oz + sz], [ox + sx, oy + sy, oz + sz], [ox, oy + sy, oz + sz]], TOP);
      face([[ox + sx, oy, oz], [ox + sx, oy + sy, oz], [ox + sx, oy + sy, oz + sz], [ox + sx, oy, oz + sz]], XF);
      face([[ox, oy + sy, oz], [ox + sx, oy + sy, oz], [ox + sx, oy + sy, oz + sz], [ox, oy + sy, oz + sz]], YF);
    };

    const lift = this.expose === 'expose' ? 1.1 : 0;
    // Three beams forming the impossible loop.
    box(0, 0, 0, L, W, W);              // along +x
    box(L - W, 0, 0, W, L, W);          // along +y
    box(L - W, L - W, 0 + lift, W, W, L); // along +z (lifted away when exposed)

    if (this.expose === 'expose') {
      const [gx, gy] = iso(L - W / 2, L - W / 2, L + lift);
      const [hx, hy] = iso(W / 2, W / 2, W);
      ctx.strokeStyle = theme.crimson; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('the bars never actually meet', w / 2, h - 30);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.expose === 'expose' ? 'exposed — an impossible object' : 'a solid triangle… or is it?', w / 2, h - 12);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Penrose());
