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

class Albers {
  private stage: CanvasStage;
  private hue = 50;
  private reveal: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 50);
    this.reveal = (hydrateFromUrl('reveal') as 'off' | 'on') ?? 'off';
    (document.getElementById('hue') as EncSlider).value = this.hue;
    (document.getElementById('reveal') as EncToggle).value = this.reveal;
    registerStateParam('hue', () => this.hue);
    registerStateParam('reveal', () => this.reveal);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('reveal') as EncToggle).addEventListener('change', (e) => {
      this.reveal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 50; this.reveal = 'off';
      (document.getElementById('hue') as EncSlider).value = 50;
      (document.getElementById('reveal') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const centre = `hsl(${this.hue}, 42%, 58%)`;

    if (this.reveal === 'on') {
      // Neutral field, twins side by side.
      ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
      const s = Math.min(w * 0.22, h * 0.4);
      const cy = h * 0.46;
      ctx.fillStyle = centre;
      ctx.fillRect(w * 0.5 - s - 2, cy - s / 2, s, s);
      ctx.fillRect(w * 0.5 + 2, cy - s / 2, s, s);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.5 - s - 2, cy - s / 2, s, s);
      ctx.strokeRect(w * 0.5 + 2, cy - s / 2, s, s);
      ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('side by side — one and the same colour', w / 2, cy + s / 2 + 30);
      ctx.textAlign = 'left';
      return;
    }

    // Two clashing backgrounds, identical centre square on each.
    ctx.fillStyle = 'hsl(28, 62%, 42%)'; ctx.fillRect(0, 0, w / 2, h);
    ctx.fillStyle = 'hsl(205, 55%, 60%)'; ctx.fillRect(w / 2, 0, w / 2, h);
    const s = Math.min(w * 0.2, h * 0.36), cy = h * 0.46;
    ctx.fillStyle = centre;
    ctx.fillRect(w * 0.25 - s / 2, cy - s / 2, s, s);
    ctx.fillRect(w * 0.75 - s / 2, cy - s / 2, s, s);
    ctx.fillStyle = 'rgba(20,20,30,0.7)'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('on a warm ground', w * 0.25, cy + s / 2 + 26);
    ctx.fillText('on a cool ground', w * 0.75, cy + s / 2 + 26);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Albers());
