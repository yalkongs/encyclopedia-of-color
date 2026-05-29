import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { cubehelix, luma, rgbCss } from '@core/math/colormaps';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Cubehelix {
  private stage: CanvasStage;
  private start = 50; private rot = -150; private hue = 120; private gamma = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.start = hydrateNumber('start', 50); this.rot = hydrateNumber('rot', -150); this.hue = hydrateNumber('hue', 120); this.gamma = hydrateNumber('gamma', 100);
    for (const k of ['start', 'rot', 'hue', 'gamma'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.start = 50; this.rot = -150; this.hue = 120; this.gamma = 100;
      (['start', 'rot', 'hue', 'gamma'] as const).forEach((k) => ((document.getElementById(k) as EncSlider).value = this[k]));
      this.draw(); notifyStateChange();
    });
  }

  private cm(t: number) { return cubehelix(t, this.start / 100, this.rot / 100, this.hue / 100, this.gamma / 100); }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const x = 30, pw = w - 60, ph = 70;
    // colour ramp
    for (let i = 0; i < pw; i++) { ctx.fillStyle = rgbCss(this.cm(i / (pw - 1))); ctx.fillRect(x + i, 44, 1, ph); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x, 44, pw, ph);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('cubehelix — colour', x, 38);
    // greyscale (luma) ramp
    const gy = 44 + ph + 40;
    for (let i = 0; i < pw; i++) { const g = luma(this.cm(i / (pw - 1))) * 255; ctx.fillStyle = `rgb(${g | 0},${g | 0},${g | 0})`; ctx.fillRect(x + i, gy, 1, ph); }
    ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(x, gy, pw, ph);
    ctx.fillStyle = theme.inkSoft; ctx.fillText('greyscale (perceived lightness) — always monotonic', x, gy - 6);
    // luma curve
    const cy = gy + ph + 30, ch = h - cy - 30;
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(x, cy, pw, ch);
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= pw; i++) { const Y = cy + ch - luma(this.cm(i / pw)) * ch; i === 0 ? ctx.moveTo(x + i, Y) : ctx.lineTo(x + i, Y); }
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('the lightness curve rises monotonically for any hue setting — B&W-safe by design', w / 2, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Cubehelix());
