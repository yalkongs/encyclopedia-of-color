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

const grey = (L: number) => { const v = Math.round(255 * Math.pow(L / 100, 1 / 2.2)); return `rgb(${v},${v},${v})`; };
const LINES = ['Comfortable reading is not a matter of maximum', 'contrast. The page should sit near the luminance', 'of the room around it, so the eye need not keep', 're-adapting between the screen and the surround.'];

class ReadingFatigue {
  private stage: CanvasStage;
  private bg = 96; private amb = 'bright';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bg = hydrateNumber('bg', 96); this.amb = hydrateFromUrl('amb') ?? 'bright';
    const s = document.getElementById('bg') as EncSlider;
    s.value = this.bg;
    s.addEventListener('input', (e) => { this.bg = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('bg', () => Math.round(this.bg));
    const t = document.getElementById('amb') as EncToggle;
    t.value = this.amb;
    t.addEventListener('change', (e) => { this.amb = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('amb', () => this.amb);
    document.addEventListener('reset-params', () => { this.bg = 96; this.amb = 'bright'; s.value = 96; t.value = 'bright'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const ambient = this.amb === 'bright' ? 78 : 22;
    // room border tinted to ambient
    ctx.fillStyle = grey(ambient); ctx.fillRect(0, 0, w, h);
    // page
    const pad = 60, px = pad, py = 36, pw = w - pad * 2, ph = h - 150;
    ctx.fillStyle = grey(this.bg); ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    // text tracks background (dark text on light page, light on dark)
    ctx.fillStyle = this.bg > 50 ? 'rgb(30,30,34)' : 'rgb(225,225,225)';
    ctx.font = '18px Inter, sans-serif'; ctx.textAlign = 'left';
    LINES.forEach((ln, i) => ctx.fillText(ln, px + 28, py + 50 + i * 30));

    // comfort gauge
    const mismatch = Math.abs(this.bg - ambient);
    const comfort = Math.max(0, 1 - mismatch / 70);
    const gy = h - 86, gw = w - 120, gx = 60;
    ctx.fillStyle = theme.goldAlpha(0.2); ctx.fillRect(gx, gy, gw, 18);
    ctx.fillStyle = comfort > 0.6 ? theme.slate : theme.crimson; ctx.fillRect(gx, gy, comfort * gw, 18);
    // ambient marker
    const ax = gx + (ambient / 100) * gw; // gauge maps... actually mark target = ambient on a luminance axis
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`comfort ${(comfort * 100) | 0}%`, gx, gy - 6);
    void ax;

    ctx.fillStyle = comfort > 0.6 ? theme.goldDeep : theme.crimson; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const msg = this.bg > ambient + 30 ? 'page far brighter than the room — glare and squinting'
      : this.bg < ambient - 30 ? 'page far dimmer than the room — the eye keeps re-adapting'
      : 'page near the ambient level — restful, low-fatigue reading';
    ctx.fillText(msg, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ReadingFatigue());
