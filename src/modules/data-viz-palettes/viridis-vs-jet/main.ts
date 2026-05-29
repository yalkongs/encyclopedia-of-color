import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { viridis, jet, luma, rgbCss, type RGB } from '@core/math/colormaps';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class ViridisVsJet {
  private stage: CanvasStage;
  private t = 50; private view = 'colour';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 50); this.view = hydrateFromUrl('view') ?? 'colour';
    const s = document.getElementById('t') as EncSlider;
    s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    const v = document.getElementById('view') as EncToggle;
    v.value = this.view;
    v.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.t = 50; this.view = 'colour'; s.value = 50; v.value = 'colour'; this.draw(); notifyStateChange(); });
  }

  private panel(ctx: CanvasRenderingContext2D, fn: (t: number) => RGB, x: number, y: number, w: number, h: number, label: string) {
    const grey = this.view === 'greyscale';
    for (let i = 0; i < w; i++) {
      const t = i / (w - 1); const c = fn(t);
      const g = luma(c) * 255;
      ctx.fillStyle = grey ? `rgb(${g | 0},${g | 0},${g | 0})` : rgbCss(c);
      ctx.fillRect(x + i, y, 1, h);
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    // luma curve
    const cy = y + h + 8, ch = 70;
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(x, cy, w, ch);
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= w; i++) { const t = i / w; const L = luma(fn(t)); const Y = cy + ch - L * ch; i === 0 ? ctx.moveTo(x + i, Y) : ctx.lineTo(x + i, Y); }
    ctx.stroke();
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 8);
    ctx.fillStyle = theme.inkHint; ctx.font = '10px Inter, sans-serif'; ctx.fillText('perceived lightness', x, cy + ch + 14);
    // marker
    const mx = x + (this.t / 100) * w;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx, cy + ch); ctx.stroke();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const pw = w - 60, ph = 56;
    this.panel(ctx, viridis, 30, 44, pw, ph, 'viridis — monotonic, honest');
    this.panel(ctx, jet, 30, 44 + ph + 92, pw, ph, 'jet — lightness zigzags, false bands');

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.view === 'greyscale'
      ? 'in greyscale jet shows a bright mid-stripe — a boundary that lives only in the colour'
      : `at ${this.t}% — viridis luma ${luma(viridis(this.t / 100)).toFixed(2)} vs jet luma ${luma(jet(this.t / 100)).toFixed(2)}`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ViridisVsJet());
