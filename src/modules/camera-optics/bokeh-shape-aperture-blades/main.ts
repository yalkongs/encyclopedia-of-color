import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class BokehBlades {
  private stage: CanvasStage;
  private blades = 6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.blades = hydrateNumber('blades', 6);
    const s = document.getElementById('blades') as EncSlider;
    s.value = this.blades;
    s.addEventListener('input', (e) => { this.blades = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('blades', () => Math.round(this.blades));
    document.addEventListener('reset-params', () => { this.blades = 6; s.value = 6; this.draw(); notifyStateChange(); });
  }

  private polygonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0e1a26'; ctx.fillRect(0, 0, w, h);
    const N = Math.round(this.blades);
    // night-street-light background
    for (let i = 0; i < 90; i++) { const x = (i * 113) % w, y = ((i * 173) % h) * 0.95; ctx.fillStyle = `rgba(${180 + (i * 17) % 60},${130 + (i * 31) % 60},${60 + (i * 41) % 80},${0.05 + 0.05 * (i % 5)})`; ctx.fillRect(x, y, 2, 2); }

    // LEFT: iris polygon
    const lx = 120, ly = h / 2, R = 80;
    ctx.fillStyle = '#1a1714'; ctx.fillRect(lx - R - 30, ly - R - 30, (R + 30) * 2, (R + 30) * 2);
    this.polygonPath(ctx, lx, ly, R, N); ctx.fillStyle = '#fff7d6'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e6e3da'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('iris', lx, ly + R + 50); ctx.fillText(`${N} blades`, lx, ly + R + 66);

    // RIGHT: bokeh highlights — each takes the iris polygon shape
    const positions: [number, number, number, string][] = [
      [w * 0.55, h * 0.30, 64, 'rgba(255,235,180,0.85)'],
      [w * 0.78, h * 0.42, 48, 'rgba(255,220,140,0.85)'],
      [w * 0.62, h * 0.62, 80, 'rgba(255,245,210,0.85)'],
      [w * 0.86, h * 0.70, 36, 'rgba(255,180,120,0.85)'],
      [w * 0.46, h * 0.75, 50, 'rgba(255,200,140,0.85)'],
    ];
    for (const [bx, by, br, col] of positions) {
      ctx.fillStyle = col;
      if (N >= 13) { ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill(); }
      else { this.polygonPath(ctx, bx, by, br, N); ctx.fill(); }
      // slight rim
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.4;
      if (N >= 13) { ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke(); }
      else { this.polygonPath(ctx, bx, by, br, N); ctx.stroke(); }
    }

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(N <= 5
      ? `${N} straight blades — sharp polygonal bokeh in every out-of-focus highlight`
      : N <= 9 ? `${N} blades — softened polygon, still recognisably faceted`
      : N >= 13 ? 'many curved blades — the polygon is so close to a circle that bokeh reads as discs'
      : `${N} blades — smooth near-circles`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new BokehBlades());
