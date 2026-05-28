import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class BenhamDisk {
  private stage: CanvasStage;
  private rpm = 300;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.rpm = hydrateNumber('rpm', 300);
    (document.getElementById('rpm') as EncSlider).value = this.rpm;
    registerStateParam('rpm', () => this.rpm);
    (document.getElementById('rpm') as EncSlider).addEventListener('input', (e) => {
      this.rpm = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.rpm = 300;
      (document.getElementById('rpm') as EncSlider).value = 300;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.42, cy = h * 0.5;
    const R = Math.min(w * 0.34, h * 0.42);
    const angle = (this.rpm / 60) * t * 2 * Math.PI;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // White disk.
    ctx.fillStyle = '#f4f1e6';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fill();
    // Black half (right).
    ctx.fillStyle = '#111118';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    // Four staggered arc groups on the white (left) half.
    ctx.strokeStyle = '#111118'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const r = R * (0.26 + 0.19 * i);
      const a0 = Math.PI * 0.58 + i * Math.PI * 0.205;
      ctx.lineWidth = R * 0.05;
      for (let k = 0; k < 3; k++) {
        const rr = r + (k - 1) * R * 0.045;
        ctx.beginPath(); ctx.arc(0, 0, rr, a0, a0 + 0.5); ctx.stroke();
      }
    }
    ctx.restore();

    // Rim.
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fill();

    // Readout / note.
    const spinning = this.rpm > 20;
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('fix your gaze on the centre dot', cx - 80, cy + R + 28);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${this.rpm} rpm`, w * 0.82, h * 0.40);
    if (spinning) {
      ctx.fillStyle = theme.crimson; ctx.fillText('inner arcs → warm red', w * 0.82, h * 0.50);
      ctx.fillStyle = theme.slate; ctx.fillText('outer arcs → cool blue', w * 0.82, h * 0.56);
      ctx.fillStyle = theme.inkMute; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
      ctx.fillText('(illusory — only in the eye)', w * 0.82, h * 0.62);
    } else {
      ctx.fillStyle = theme.inkMute; ctx.fillText('still — no colour', w * 0.82, h * 0.50);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new BenhamDisk());
