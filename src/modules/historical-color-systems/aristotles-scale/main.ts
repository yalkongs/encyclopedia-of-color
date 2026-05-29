import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Aristotle's seven-step ladder (De Sensu / Meteorologica) — orderings vary; this is the
// common reconstruction from white to black, hues read as degrees of brightness.
const STOPS: Array<{ at: number; css: string; name: string }> = [
  { at: 0, css: 'rgb(248,244,232)', name: 'white (leukon)' },
  { at: 17, css: 'rgb(228,196,90)', name: 'yellow (xanthon)' },
  { at: 34, css: 'rgb(190,70,55)', name: 'red (erythron)' },
  { at: 50, css: 'rgb(120,60,120)', name: 'purple (halourgon)' },
  { at: 66, css: 'rgb(70,120,80)', name: 'green (prasinon)' },
  { at: 83, css: 'rgb(55,75,120)', name: 'blue (kyanon)' },
  { at: 100, css: 'rgb(28,28,40)', name: 'black (melan)' },
];

class AristotleScale {
  private stage: CanvasStage;
  private pos = 42;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pos = hydrateNumber('pos', 42);
    const el = document.getElementById('pos') as EncSlider;
    el.value = this.pos;
    el.addEventListener('input', (e) => { this.pos = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pos', () => Math.round(this.pos));
    document.addEventListener('reset-params', () => { this.pos = 42; el.value = 42; this.draw(); notifyStateChange(); });
  }

  private nearest(): { name: string; css: string } {
    let best = STOPS[0];
    for (const s of STOPS) if (Math.abs(s.at - this.pos) < Math.abs(best.at - this.pos)) best = s;
    return best;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const x0 = 60, barW = w - 120, y = h * 0.42, barH = 64;
    // gradient along the ladder
    const grad = ctx.createLinearGradient(x0, 0, x0 + barW, 0);
    for (const s of STOPS) grad.addColorStop(s.at / 100, s.css);
    ctx.fillStyle = grad; ctx.fillRect(x0, y, barW, barH);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y, barW, barH);

    // stop ticks + names
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const s of STOPS) {
      const sx = x0 + (s.at / 100) * barW;
      ctx.strokeStyle = theme.inkAlpha(0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, y + barH); ctx.lineTo(sx, y + barH + 6); ctx.stroke();
      ctx.fillStyle = theme.inkMute;
      ctx.save(); ctx.translate(sx, y + barH + 12); ctx.rotate(Math.PI / 6); ctx.textAlign = 'left';
      ctx.fillText(s.name, 0, 0); ctx.restore();
    }

    // marker
    const mx = x0 + (this.pos / 100) * barW;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, y - 12); ctx.lineTo(mx, y + barH + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - 6, y - 12); ctx.lineTo(mx + 6, y - 12); ctx.lineTo(mx, y - 4); ctx.closePath(); ctx.fillStyle = theme.ink; ctx.fill();

    const n = this.nearest();
    ctx.textAlign = 'left'; ctx.fillStyle = theme.crimson; ctx.font = '700 24px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(n.name, x0, y - 30);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('one axis only — hue and brightness were not yet separated', w / 2, h - 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new AristotleScale());
