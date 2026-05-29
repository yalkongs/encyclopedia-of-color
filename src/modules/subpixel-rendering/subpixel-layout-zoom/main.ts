import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class SubpixelLayout {
  private stage: CanvasStage;
  private layout = 'stripe';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.layout = hydrateFromUrl('layout') ?? 'stripe';
    const t = document.getElementById('layout') as EncToggle;
    t.value = this.layout;
    t.addEventListener('change', (e) => { this.layout = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('layout', () => this.layout);
    document.addEventListener('reset-params', () => { this.layout = 'stripe'; t.value = 'stripe'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#08080c'; ctx.fillRect(0, 0, w, h);
    const x0 = 40, y0 = 44, gw = w - 80, gh = h - 100;
    const P = 64; // pixel cell size
    const cols = Math.floor(gw / P), rows = Math.floor(gh / P);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x0 + c * P, cy = y0 + r * P;
        if (this.layout === 'stripe' || this.layout === 'bgr') {
          const order = this.layout === 'stripe' ? ['#ff3b3b', '#39e639', '#3b6bff'] : ['#3b6bff', '#39e639', '#ff3b3b'];
          const sw = P / 3;
          order.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(cx + i * sw + 1, cy + 1, sw - 2, P - 2); });
        } else {
          // PenTile diamond: dense green diamonds, sparse larger R/B on a checkerboard
          ctx.fillStyle = '#39e639';
          ctx.beginPath(); ctx.ellipse(cx + P * 0.5, cy + P * 0.28, P * 0.13, P * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx + P * 0.5, cy + P * 0.72, P * 0.13, P * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          const rb = (r + c) % 2 === 0 ? '#ff3b3b' : '#3b6bff';
          ctx.fillStyle = rb; ctx.beginPath(); ctx.ellipse(cx + P * 0.5, cy + P * 0.5, P * 0.2, P * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const msg: Record<string, string> = {
      stripe: 'RGB stripe — one red, green, and blue per pixel, evenly split',
      bgr: 'BGR — the same thirds in reverse order (some panels and projectors)',
      pentile: 'PenTile diamond — dense greens, sparse shared red/blue dots',
    };
    ctx.fillText(msg[this.layout], w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new SubpixelLayout());
