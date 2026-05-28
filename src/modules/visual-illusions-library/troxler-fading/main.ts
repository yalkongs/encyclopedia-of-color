import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const BLOBS = 8;
const HUES = [0, 45, 90, 140, 190, 240, 290, 330];
const CYCLE = 8, FADE = 6;
const BG: [number, number, number] = [186, 186, 178];

class Troxler {
  private stage: CanvasStage;
  private soft = 70;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.soft = hydrateNumber('soft', 70);
    (document.getElementById('soft') as EncSlider).value = this.soft;
    registerStateParam('soft', () => this.soft);
    (document.getElementById('soft') as EncSlider).addEventListener('input', (e) => {
      this.soft = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.soft = 70;
      (document.getElementById('soft') as EncSlider).value = 70;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`; ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5, cy = h * 0.5;
    const ring = Math.min(w, h) * 0.34;
    const r = ring * 0.3;
    const phase = (t % CYCLE);
    const vis = Math.max(0, 1 - phase / FADE); // simulated fade
    const softFrac = this.soft / 100;

    for (let i = 0; i < BLOBS; i++) {
      const a = (i / BLOBS) * 2 * Math.PI - Math.PI / 2;
      const x = cx + ring * Math.cos(a), y = cy + ring * Math.sin(a);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      const peak = 0.30 + 0.30 * (1 - softFrac); // softer = lower contrast
      grad.addColorStop(0, `hsla(${HUES[i]}, 55%, 60%, ${(peak * vis).toFixed(3)})`);
      grad.addColorStop(softFrac * 0.6, `hsla(${HUES[i]}, 55%, 60%, ${(peak * vis * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `hsla(${HUES[i]}, 55%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
    }

    // Fixation cross.
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9); ctx.stroke();

    ctx.fillStyle = theme.ink; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('hold your gaze on the cross — do not move your eyes', cx, h - 16);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Troxler());
