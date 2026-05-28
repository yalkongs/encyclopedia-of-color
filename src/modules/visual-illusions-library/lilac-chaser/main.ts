import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N = 12;

class LilacChaser {
  private stage: CanvasStage;
  private speed = 1.2;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.speed = hydrateNumber('speed', 1.2);
    (document.getElementById('speed') as EncSlider).value = this.speed;
    registerStateParam('speed', () => this.speed);
    (document.getElementById('speed') as EncSlider).addEventListener('input', (e) => {
      this.speed = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.speed = 1.2;
      (document.getElementById('speed') as EncSlider).value = 1.2;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#bdbdb2'; ctx.fillRect(0, 0, w, h); // neutral grey field

    const cx = w * 0.5, cy = h * 0.5;
    const ring = Math.min(w, h) * 0.36;
    const dot = ring * 0.16;
    const gap = Math.floor((t * this.speed * N) % N); // which dot is blank

    for (let i = 0; i < N; i++) {
      if (i === gap) continue;
      const a = (i / N) * 2 * Math.PI - Math.PI / 2;
      const x = cx + ring * Math.cos(a), y = cy + ring * Math.sin(a);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, dot);
      grad.addColorStop(0, 'rgba(204,102,204,0.95)');
      grad.addColorStop(1, 'rgba(204,102,204,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, dot, 0, 2 * Math.PI); ctx.fill();
    }

    // Fixation cross.
    ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9); ctx.stroke();

    ctx.fillStyle = theme.ink; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('keep your eyes on the cross', cx, cy + ring + dot + 28);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new LilacChaser());
