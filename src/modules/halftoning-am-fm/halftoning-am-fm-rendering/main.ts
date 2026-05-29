import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { clusteredScreen, hash2 } from '@core/render/halftone';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class AmFm {
  private stage: CanvasStage;
  private mode = 'am';
  private pitch = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mode = hydrateFromUrl('mode') ?? 'am';
    this.pitch = hydrateNumber('pitch', 10);
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    const s = document.getElementById('pitch') as EncSlider;
    s.value = this.pitch;
    s.addEventListener('input', (e) => { this.pitch = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pitch', () => Math.round(this.pitch));
    document.addEventListener('reset-params', () => { this.mode = 'am'; this.pitch = 10; t.value = 'am'; s.value = 10; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 30, x1 = w - 30, y1 = h - 60, gw = x1 - x0;
    const cov = (x: number) => Math.max(0, Math.min(1, (x - x0) / gw)); // dark→light? ramp 0→1 left→right

    if (this.mode === 'am') {
      clusteredScreen(ctx, x0, y0, x1, y1, this.pitch, 45, '#1a1714', (x) => cov(x), { bg: '#f7f5ef' });
    } else {
      // FM: fixed micro-dots, density ∝ coverage, placed stochastically
      const grid = this.pitch, rad = Math.max(0.9, grid * 0.30);
      ctx.fillStyle = '#1a1714';
      for (let gy = y0; gy < y1; gy += grid) {
        for (let gx = x0; gx < x1; gx += grid) {
          const c = cov(gx);
          if (hash2(gx, gy) < c) { ctx.beginPath(); ctx.arc(gx + grid / 2, gy + grid / 2, rad, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, gw, y1 - y0);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left'; ctx.fillText('highlight (0%)', x0, y1 + 16);
    ctx.textAlign = 'right'; ctx.fillText('shadow (100%)', x1, y1 + 16);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'am'
      ? 'AM — dots locked to a grid, swelling toward the shadows'
      : 'FM — one dot size, simply more of them toward the shadows', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new AmFm());
