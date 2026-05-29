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

class MiniLED {
  private stage: CanvasStage;
  private zones = 200;
  private tech = 'miniled';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.zones = hydrateNumber('zones', 200);
    this.tech = hydrateFromUrl('tech') ?? 'miniled';
    const s = document.getElementById('zones') as EncSlider;
    s.value = this.zones;
    s.addEventListener('input', (e) => { this.zones = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('zones', () => Math.round(this.zones));
    const t = document.getElementById('tech') as EncToggle;
    t.value = this.tech;
    t.addEventListener('change', (e) => { this.tech = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tech', () => this.tech);
    document.addEventListener('reset-params', () => { this.zones = 200; this.tech = 'miniled'; s.value = 200; t.value = 'miniled'; this.draw(); notifyStateChange(); });
  }

  // image content: two bright marks on black
  private content(u: number, v: number): number {
    const m1 = Math.exp(-(((u - 0.36) ** 2 + (v - 0.45) ** 2) / 0.0006));
    const m2 = Math.exp(-(((u - 0.64) ** 2 + (v - 0.6) ** 2) / 0.0004));
    return Math.min(1, m1 + m2);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0a0a0d'; ctx.fillRect(0, 0, w, h);
    const x0 = 36, y0 = 36, sw = w - 72, sh = h - 96;
    const aspect = sw / sh;

    const oled = this.tech === 'oled';
    const nz = Math.round(this.zones);
    const cols = Math.max(1, Math.round(Math.sqrt(nz * aspect)));
    const rows = Math.max(1, Math.round(nz / cols));

    // backlight per zone = max content in zone (Mini-LED); OLED handled per-pixel
    const zoneBL: number[] = [];
    if (!oled) {
      for (let zr = 0; zr < rows; zr++) for (let zc = 0; zc < cols; zc++) {
        let mx = 0;
        for (let s = 0; s <= 3; s++) for (let tt = 0; tt <= 3; tt++) mx = Math.max(mx, this.content((zc + s / 3) / cols, (zr + tt / 3) / rows));
        zoneBL[zr * cols + zc] = mx;
      }
    }

    const res = 200;
    const rx = Math.round(res * aspect);
    for (let py = 0; py < res; py++) {
      for (let pxi = 0; pxi < rx; pxi++) {
        const u = pxi / rx, v = py / res;
        const lcd = this.content(u, v);
        let out: number;
        if (oled) {
          out = lcd; // self-emissive: pixel is its own light, perfect black
        } else {
          const zc = Math.min(cols - 1, Math.floor(u * cols)), zr = Math.min(rows - 1, Math.floor(v * rows));
          const bl = Math.max(0.02, zoneBL[zr * cols + zc]); // zone backlight, small floor
          // LCD transmits content but leaks ~3% of the lit backlight where it should be black
          out = Math.min(1, lcd * bl + bl * 0.04 * (1 - lcd));
        }
        const g = Math.round(Math.pow(out, 1 / 2.2) * 255);
        ctx.fillStyle = `rgb(${g},${g},${Math.min(255, g + 4)})`;
        ctx.fillRect(x0 + u * sw, y0 + v * sh, sw / rx + 1, sh / res + 1);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, sw, sh);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(oled
      ? 'OLED — every pixel its own light; black is truly off, no bloom'
      : `${nz}-zone Mini-LED — deep blacks, but a bloom halo one zone wide rings each bright mark`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MiniLED());
