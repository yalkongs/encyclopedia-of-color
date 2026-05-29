import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Approximate sRGB renderings of well-known PMS spot colours (coated).
const PMS: Array<{ name: string; hex: string; note: string }> = [
  { name: 'PMS 185 C', hex: '#e4002b', note: 'a bright signal red' },
  { name: 'PMS 021 C', hex: '#fe5000', note: 'vivid orange — outside CMYK gamut' },
  { name: 'PMS 116 C', hex: '#ffcd00', note: 'process yellow' },
  { name: 'PMS 802 C', hex: '#44d62c', note: 'neon green — far outside CMYK' },
  { name: 'PMS 354 C', hex: '#00b140', note: 'kelly green' },
  { name: 'PMS 3265 C', hex: '#00c1d5', note: 'bright cyan' },
  { name: 'PMS 300 C', hex: '#005eb8', note: 'a classic corporate blue' },
  { name: 'PMS 286 C', hex: '#0033a0', note: 'deep flag blue' },
  { name: 'PMS 2685 C', hex: '#56008a', note: 'rich violet — outside CMYK' },
  { name: 'PMS 232 C', hex: '#ef3eb4', note: 'magenta-pink' },
  { name: 'PMS Cool Gray 7 C', hex: '#97999b', note: 'a neutral grey ink' },
  { name: 'PMS Black 6 C', hex: '#101820', note: 'a dense near-black' },
];

class Pantone {
  private stage: CanvasStage;
  private i = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.i = hydrateNumber('i', 0);
    const s = document.getElementById('i') as EncSlider;
    s.value = this.i;
    s.addEventListener('input', (e) => { this.i = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('i', () => Math.round(this.i));
    document.addEventListener('reset-params', () => { this.i = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const sel = PMS[Math.round(this.i)];

    // large swatch (Pantone-chip style: colour panel + white label foot)
    const cw = Math.min(w * 0.5, 320), cx = w * 0.5 - cw / 2, cy = 40, ch = h - 160;
    ctx.fillStyle = sel.hex; ctx.fillRect(cx, cy, cw, ch * 0.78);
    ctx.fillStyle = theme.paper; ctx.fillRect(cx, cy + ch * 0.78, cw, ch * 0.22);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, cw, ch);
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 16px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(sel.name, cx + 14, cy + ch * 0.78 + 26);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.fillText(sel.hex.toUpperCase() + ' (approx)', cx + 14, cy + ch * 0.78 + 46);

    // strip of all
    const sx = 30, sy = h - 90, sw = (w - 60) / PMS.length;
    PMS.forEach((p, k) => {
      ctx.fillStyle = p.hex; ctx.fillRect(sx + k * sw, sy, sw - 2, 36);
      if (k === Math.round(this.i)) { ctx.strokeStyle = theme.ink; ctx.lineWidth = 2.5; ctx.strokeRect(sx + k * sw, sy, sw - 2, 36); }
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${sel.note} — a physical spot ink; the screen value is only an approximation`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Pantone());
