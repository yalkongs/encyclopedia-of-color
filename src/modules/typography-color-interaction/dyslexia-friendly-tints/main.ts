import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TINTS: Array<{ bg: string; name: string }> = [
  { bg: '#ffffff', name: 'stark white (often the worst)' },
  { bg: '#fbf3df', name: 'cream' },
  { bg: '#efe6cf', name: 'beige' },
  { bg: '#fbe8da', name: 'soft peach' },
  { bg: '#e2ecf5', name: 'soft blue' },
  { bg: '#e4f0e2', name: 'soft green' },
  { bg: '#ecebe9', name: 'warm grey' },
];
const INK = '#2c2c33';
const LINES = ['Some readers find that pure black text on a pure', 'white page seems to shimmer or swirl. A gentle', 'tinted background with dark-grey rather than black', 'ink can settle the text and ease visual stress. The', 'best tint differs from person to person.'];

class DyslexiaTints {
  private stage: CanvasStage;
  private tint = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tint = hydrateNumber('tint', 1);
    const s = document.getElementById('tint') as EncSlider;
    s.value = this.tint;
    s.addEventListener('input', (e) => { this.tint = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tint', () => Math.round(this.tint));
    document.addEventListener('reset-params', () => { this.tint = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const t = TINTS[Math.round(this.tint)];
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const px = 30, py = 36, pw = w - 60, ph = h - 130;
    ctx.fillStyle = t.bg; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = INK; ctx.font = '20px Inter, sans-serif'; ctx.textAlign = 'left';
    LINES.forEach((ln, i) => ctx.fillText(ln, px + 30, py + 56 + i * 36));

    // tint swatch strip
    const sx = 30, sy = h - 80, sw = (w - 60) / TINTS.length;
    TINTS.forEach((tt, k) => { ctx.fillStyle = tt.bg; ctx.fillRect(sx + k * sw, sy, sw - 3, 30); ctx.strokeStyle = k === Math.round(this.tint) ? theme.ink : axisStyle.baseline; ctx.lineWidth = k === Math.round(this.tint) ? 2.5 : 1; ctx.strokeRect(sx + k * sw, sy, sw - 3, 30); });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${t.name} — off-white tints with dark-grey ink ease visual stress (BDA guidance)`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new DyslexiaTints());
