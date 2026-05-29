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

const SURROUNDS = [0, 90, 180, 270];
const CENTRE = 'rgb(178,178,178)'; // identical grey in every panel

class Simultaneous {
  private stage: CanvasStage;
  private sat = 70; private reveal = 'fields';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sat = hydrateNumber('sat', 70); this.reveal = hydrateFromUrl('reveal') ?? 'fields';
    const s = document.getElementById('sat') as EncSlider;
    s.value = this.sat;
    s.addEventListener('input', (e) => { this.sat = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sat', () => Math.round(this.sat));
    const t = document.getElementById('reveal') as EncToggle;
    t.value = this.reveal;
    t.addEventListener('change', (e) => { this.reveal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('reveal', () => this.reveal);
    document.addEventListener('reset-params', () => {
      this.sat = 70; this.reveal = 'fields'; s.value = 70; t.value = 'fields'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const neutral = this.reveal === 'neutral';

    const gap = 16, cols = 2;
    const pw = (w - 60 - gap) / cols, ph = (h - 90 - gap) / 2;
    const x0 = 30, y0 = 30;
    SURROUNDS.forEach((hue, i) => {
      const cx = x0 + (i % 2) * (pw + gap), cy = y0 + Math.floor(i / 2) * (ph + gap);
      ctx.fillStyle = neutral ? theme.paperRecess : `hsl(${hue}, ${this.sat}%, 50%)`;
      ctx.fillRect(cx, cy, pw, ph);
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, pw, ph);
      // identical centre
      const s = Math.min(pw, ph) * 0.4;
      ctx.fillStyle = CENTRE; ctx.fillRect(cx + pw / 2 - s / 2, cy + ph / 2 - s / 2, s, s);
      if (!neutral) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`field ${hue}°`, cx + 8, cy + 16);
      }
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(neutral
      ? 'on one neutral ground the four centres are plainly identical — the field did the rest'
      : 'the centre is one colour pasted four times — each field tints it toward its own complement', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Simultaneous());
