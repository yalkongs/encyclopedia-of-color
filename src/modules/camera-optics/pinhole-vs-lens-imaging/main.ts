import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class PinholeLens {
  private stage: CanvasStage;
  private opt = 'lens';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.opt = hydrateFromUrl('opt') ?? 'lens';
    const t = document.getElementById('opt') as EncToggle;
    t.value = this.opt;
    t.addEventListener('change', (e) => { this.opt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('opt', () => this.opt);
    document.addEventListener('reset-params', () => { this.opt = 'lens'; t.value = 'lens'; this.draw(); notifyStateChange(); });
  }

  private flower(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, hue: number, blur: number, dim: number) {
    ctx.save();
    if (blur > 0) ctx.filter = `blur(${blur}px) brightness(${dim})`; else if (dim !== 1) ctx.filter = `brightness(${dim})`;
    ctx.fillStyle = '#0a1a0a'; ctx.fillRect(x - sz * 0.06, y + sz * 0.4, sz * 0.12, sz * 0.9);
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2, pr = sz * 0.42;
      ctx.fillStyle = `hsl(${hue + p * 4}, 80%, 60%)`;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * pr, y + Math.sin(a) * pr * 0.9, sz * 0.24, sz * 0.16, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x, y, sz * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const pinhole = this.opt === 'pinhole';
    ctx.fillStyle = pinhole ? '#1a2a1a' : '#3c5e3c'; ctx.fillRect(0, 0, w, h);
    const dim = pinhole ? 0.5 : 1.0;          // pinhole is dim
    const blurPinhole = pinhole ? 1.5 : 0;     // mild diffraction softness

    // far flower (background)
    this.flower(ctx, w * 0.7, h * 0.42, h * 0.28, 200, blurPinhole + (pinhole ? 0 : 10), dim);
    // near flower (foreground, focal plane on lens)
    this.flower(ctx, w * 0.35, h * 0.62, h * 0.36, 320, blurPinhole, dim);

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(20, 20, 200, 40);
    ctx.fillStyle = '#f4ecd6'; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(pinhole ? 'optics  pinhole (everything in focus, dim)' : 'optics  lens (one plane sharp, bright)', 30, 46);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(pinhole
      ? 'pinhole — both flowers equally sharp, image dim and slightly soft from diffraction'
      : 'lens — the near flower is crisp, the far one blurs because the cone of rays misses the focal plane', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new PinholeLens());
