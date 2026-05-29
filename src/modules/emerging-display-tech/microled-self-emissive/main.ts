import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class MicroLED {
  private stage: CanvasStage;
  private bright = 1500;
  private tech = 'microled';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bright = hydrateNumber('bright', 1500);
    this.tech = hydrateFromUrl('tech') ?? 'microled';
    const s = document.getElementById('bright') as EncSlider;
    s.value = this.bright;
    s.addEventListener('input', (e) => { this.bright = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('bright', () => Math.round(this.bright));
    const t = document.getElementById('tech') as EncToggle;
    t.value = this.tech;
    t.addEventListener('change', (e) => { this.tech = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tech', () => this.tech);
    document.addEventListener('reset-params', () => { this.bright = 1500; this.tech = 'microled'; s.value = 1500; t.value = 'microled'; this.draw(); notifyStateChange(); });
  }

  // a starfield + bright crescent on black — content 0..1 per channel-ish (grayscale)
  private content(u: number, v: number): number {
    // crescent
    const d = Math.hypot((u - 0.5) * 1.1, v - 0.5);
    const cres = Math.exp(-((d - 0.22) ** 2) / 0.0016) * (u > 0.46 ? 1 : 0.2);
    // a few stars
    let stars = 0;
    const pts = [[0.2, 0.25], [0.78, 0.2], [0.3, 0.75], [0.7, 0.78], [0.15, 0.6], [0.85, 0.55]];
    for (const [sx, sy] of pts) stars = Math.max(stars, Math.exp(-(((u - sx) ** 2 + (v - sy) ** 2) / 0.00025)));
    return Math.min(1, cres + stars);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#070709'; ctx.fillRect(0, 0, w, h);
    const x0 = 36, y0 = 36, sw = w - 72, sh = h - 96;
    const aspect = sw / sh;
    const lcd = this.tech === 'lcd';
    const peak01 = this.bright / 4000;                 // normalised peak
    const leak = lcd ? 0.04 * peak01 : 0;              // LCD black floor rises with backlight

    const res = 220, rx = Math.round(res * aspect);
    for (let py = 0; py < res; py++) {
      for (let pxi = 0; pxi < rx; pxi++) {
        const u = pxi / rx, v = py / res;
        const c = this.content(u, v);
        const out = Math.min(1, c * peak01 + leak * (1 - c));
        const g = Math.round(Math.pow(out, 1 / 2.2) * 255);
        // slight warm tint on highlights
        ctx.fillStyle = `rgb(${Math.min(255, g + 6)},${g},${Math.round(g * 0.92)})`;
        ctx.fillRect(x0 + u * sw, y0 + v * sh, sw / rx + 1, sh / res + 1);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, sw, sh);

    const contrast = lcd ? (peak01 / Math.max(leak, 1e-6)).toFixed(0) : '∞';
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(lcd
      ? `LCD at ${Math.round(this.bright)} nits — the black sky greys out as the backlight leaks; contrast ≈ ${contrast}:1`
      : `microLED at ${Math.round(this.bright)} nits — the sky stays perfectly black at any brightness; contrast = ∞`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MicroLED());
