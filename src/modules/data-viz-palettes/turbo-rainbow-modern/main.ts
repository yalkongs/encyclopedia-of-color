import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { turbo, jet, luma, rgbCss, type RGB } from '@core/math/colormaps';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class TurboMod {
  private stage: CanvasStage;
  private t = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 50);
    const s = document.getElementById('t') as EncSlider;
    s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    document.addEventListener('reset-params', () => { this.t = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private panel(ctx: CanvasRenderingContext2D, fn: (t: number) => RGB, x: number, y: number, w: number, h: number, label: string) {
    for (let i = 0; i < w; i++) { ctx.fillStyle = rgbCss(fn(i / (w - 1))); ctx.fillRect(x + i, y, 1, h); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    const cy = y + h + 8, ch = 64;
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(x, cy, w, ch);
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= w; i++) { const Y = cy + ch - luma(fn(i / w)) * ch; i === 0 ? ctx.moveTo(x + i, Y) : ctx.lineTo(x + i, Y); }
    ctx.stroke();
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 8);
    const mx = x + (this.t / 100) * w; ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx, cy + ch); ctx.stroke();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const pw = w - 60, ph = 54;
    this.panel(ctx, turbo, 30, 44, pw, ph, 'Turbo — debanded rainbow');
    this.panel(ctx, jet, 30, 44 + ph + 88, pw, ph, 'jet — muddy bands, harsh jumps');
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('Turbo is the rainbow done right — but both rise and fall in lightness; use viridis for ordered data', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new TurboMod());
