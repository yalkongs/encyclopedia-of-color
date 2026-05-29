import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class Backlight {
  private stage: CanvasStage;
  private zones = 8; private type = 'array';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.zones = hydrateNumber('zones', 8); this.type = hydrateFromUrl('type') ?? 'array';
    const s = document.getElementById('zones') as EncSlider;
    s.value = this.zones;
    s.addEventListener('input', (e) => { this.zones = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('zones', () => Math.round(this.zones));
    const t = document.getElementById('type') as EncToggle;
    t.value = this.type;
    t.addEventListener('change', (e) => { this.type = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('type', () => this.type);
    document.addEventListener('reset-params', () => { this.zones = 8; this.type = 'array'; s.value = 8; t.value = 'array'; this.draw(); notifyStateChange(); });
  }

  // content luminance 0..1 at normalized (u,v): a bright star at centre
  private content(u: number, v: number): number {
    const d = Math.hypot(u - 0.5, v - 0.5);
    return Math.max(0, 1 - d / 0.08) ** 1.5;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 36, sw = w - 60, sh = h - 90;
    const nz = this.type === 'edge' ? 1 : Math.round(this.zones);
    // backlight per zone = max content luminance in that zone
    const cols = nz === 1 ? 1 : nz, rows = nz === 1 ? 1 : Math.max(1, Math.round(nz * sh / sw));
    const res = 120;
    for (let py = 0; py < res; py++) {
      for (let pxi = 0; pxi < res * (sw / sh); pxi++) {
        const u = pxi / (res * (sw / sh)), v = py / res;
        // zone of this point
        let backlight: number;
        if (this.type === 'edge') backlight = 0.16; // global floor, can't go black
        else {
          const zc = Math.floor(u * cols), zr = Math.floor(v * rows);
          // max content in the zone (sample zone centre region)
          let mx = 0;
          for (let s = 0; s <= 4; s++) for (let tt = 0; tt <= 4; tt++) mx = Math.max(mx, this.content((zc + s / 4) / cols, (zr + tt / 4) / rows));
          backlight = Math.max(0.015, mx);
        }
        const lcd = this.content(u, v); // LCD transmits the content
        const out = Math.min(1, lcd * 1.0 + backlight * (lcd > 0.02 ? 1 : 0.18)); // dark areas show leaked backlight
        const g = Math.round(out * 255);
        ctx.fillStyle = `rgb(${g},${g},${Math.min(255, g + 6)})`;
        ctx.fillRect(x0 + u * sw, y0 + v * sh, sw / (res * (sw / sh)) + 1, sh / res + 1);
      }
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, sw, sh);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.type === 'edge' ? 'edge-lit — the whole field glows grey, no true black' : `${nz}-zone array — deeper black, but a blocky bloom haloes the star`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Backlight());
