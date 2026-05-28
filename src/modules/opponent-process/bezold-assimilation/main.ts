import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Bezold {
  private stage: CanvasStage;
  private hue = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 10);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => this.hue);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 10;
      (document.getElementById('hue') as EncSlider).value = 10;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const base = `hsl(${this.hue}, 60%, 50%)`;

    const py = 56, ph = h * 0.62, halfW = (w - 80) / 2;
    const lx = 40, rx = 40 + halfW;

    // Both halves: identical base colour.
    ctx.fillStyle = base;
    ctx.fillRect(lx, py, halfW, ph);
    ctx.fillRect(rx, py, halfW, ph);

    // Left half: thin black lines. Right half: thin white lines.
    const period = 8;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a0a0e';
    for (let y = py; y < py + ph; y += period) {
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + halfW, y); ctx.stroke();
    }
    ctx.strokeStyle = '#f6f3ea';
    for (let y = py + period / 2; y < py + ph; y += period) {
      ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + halfW, y); ctx.stroke();
    }

    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(lx, py, halfW, ph); ctx.strokeRect(rx, py, halfW, ph);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('base + black lines → looks darker', lx + halfW / 2, py + ph + 22);
    ctx.fillText('base + white lines → looks lighter', rx + halfW / 2, py + ph + 22);
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('both halves share the identical base colour', 40, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Bezold());
