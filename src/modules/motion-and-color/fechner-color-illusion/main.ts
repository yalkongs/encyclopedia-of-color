import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Fechner {
  private stage: CanvasStage;
  private freq = 8;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.freq = hydrateNumber('freq', 8);
    (document.getElementById('freq') as EncSlider).value = this.freq;
    registerStateParam('freq', () => this.freq);
    (document.getElementById('freq') as EncSlider).addEventListener('input', (e) => {
      this.freq = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.freq = 8;
      (document.getElementById('freq') as EncSlider).value = 8;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5, cy = h * 0.46;
    const R = Math.min(w * 0.26, h * 0.34);

    // Flicker state: black when sin>0 else white. At freq 0 it holds grey.
    const on = this.freq > 0.1 ? Math.sin(2 * Math.PI * this.freq * t) > 0 : true;
    ctx.fillStyle = this.freq < 0.1 ? '#7d7d7d' : on ? '#111118' : '#f4f1e6';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    // Fixation mark.
    ctx.strokeStyle = on && this.freq >= 0.1 ? '#f4f1e6' : '#111118'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();

    // Readout.
    const band = this.freq < 0.1 ? 'static — no colour' : this.freq >= 5 && this.freq <= 10 ? 'peak illusory-colour band' : this.freq < 5 ? 'too slow — flicker visible' : 'too fast — fusing to grey';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.freq.toFixed(1)} Hz   ·   ${band}`, cx, cy + R + 34);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Fechner());
