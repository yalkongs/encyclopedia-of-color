import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const CYCLE = 6; // seconds for the afterimage glow-and-fade loop

class Afterimages {
  private stage: CanvasStage;
  private hue = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.hue = hydrateNumber('hue', 0);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => this.hue);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 0;
      (document.getElementById('hue') as EncSlider).value = 0;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const r = Math.min(w * 0.16, h * 0.3);
    const cy = h * 0.46;
    const lx = w * 0.3, rx = w * 0.7;
    const compHue = (this.hue + 180) % 360;

    // Adapting disc.
    ctx.fillStyle = `hsl(${this.hue}, 78%, 50%)`;
    ctx.beginPath(); ctx.arc(lx, cy, r, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx - 8, cy); ctx.lineTo(lx + 8, cy); ctx.moveTo(lx, cy - 8); ctx.lineTo(lx, cy + 8); ctx.stroke();

    // White field + fading complementary afterimage.
    ctx.fillStyle = '#f6f3ea';
    ctx.fillRect(rx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
    const phase = (t % CYCLE) / CYCLE;          // 0..1
    const alpha = Math.max(0, 0.55 * (1 - phase)); // glow then fade
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${compHue}, 60%, 62%)`;
    ctx.beginPath(); ctx.arc(rx, cy, r, 0, 2 * Math.PI); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(rx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('stare at the dot…', lx, cy + r + 26);
    ctx.fillText('…then look here', rx, cy + r + 26);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`adapt ${this.hue}°  →  afterimage ≈ ${compHue}°`, w / 2, h - 14);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Afterimages());
