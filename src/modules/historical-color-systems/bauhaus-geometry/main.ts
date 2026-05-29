import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const SHAPES: Record<string, { css: string; name: string; why: string }> = {
  triangle: { css: 'rgb(232,200,48)', name: 'yellow', why: 'acute, restless, radiant — the lightest, most active hue' },
  square: { css: 'rgb(198,46,46)', name: 'red', why: 'stable, grounded, weighty — matched to the heaviest, most material hue' },
  circle: { css: 'rgb(46,90,180)', name: 'blue', why: 'endless, calm, receding — the deepest, most spiritual hue' },
};

class Bauhaus {
  private stage: CanvasStage;
  private shape = 'triangle';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.shape = hydrateFromUrl('shape') ?? 'triangle';
    const t = document.getElementById('shape') as EncToggle;
    t.value = this.shape;
    t.addEventListener('change', (e) => { this.shape = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('shape', () => this.shape);
    document.addEventListener('reset-params', () => { this.shape = 'triangle'; t.value = 'triangle'; this.draw(); notifyStateChange(); });
  }

  private shapePath(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, r: number) {
    ctx.beginPath();
    if (kind === 'triangle') {
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * (2 * Math.PI / 3); const X = cx + r * Math.cos(a), Y = cy + r * Math.sin(a); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.closePath();
    } else if (kind === 'square') {
      const s = r * 0.86; ctx.rect(cx - s, cy - s, 2 * s, 2 * s);
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // big selected shape
    const cx = w * 0.4, cy = h * 0.46, R = Math.min(w, h) * 0.3;
    const info = SHAPES[this.shape];
    this.shapePath(ctx, this.shape, cx, cy, R);
    ctx.fillStyle = info.css; ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.5; ctx.stroke();

    // the three small shapes as a selector legend on the right
    const kinds = ['triangle', 'square', 'circle'];
    const rx = w * 0.78, r0 = 30;
    kinds.forEach((k, i) => {
      const y = h * 0.28 + i * (h * 0.2);
      ctx.globalAlpha = k === this.shape ? 1 : 0.4;
      this.shapePath(ctx, k, rx, y, r0);
      ctx.fillStyle = SHAPES[k].css; ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${k} → ${SHAPES[k].name}`, rx, y + r0 + 16);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = theme.crimson; ctx.font = '700 24px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${this.shape} → ${info.name}`, cx, cy + R + 44);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(info.why, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Bauhaus());
