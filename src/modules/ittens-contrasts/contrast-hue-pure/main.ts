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

// Triad uses the painter's primaries Itten taught; hexad/twelve step the wheel.
const HUE_SETS: Record<string, number[]> = {
  '3': [0, 60, 220],          // red, yellow, blue
  '6': [0, 60, 120, 180, 240, 300],
  '12': Array.from({ length: 12 }, (_, i) => i * 30),
};

class HuePure {
  private stage: CanvasStage;
  private sat = 100; private n = '3';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sat = hydrateNumber('sat', 100); this.n = hydrateFromUrl('n') ?? '3';
    const s = document.getElementById('sat') as EncSlider;
    s.value = this.sat;
    s.addEventListener('input', (e) => { this.sat = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sat', () => Math.round(this.sat));
    const t = document.getElementById('n') as EncToggle;
    t.value = this.n;
    t.addEventListener('change', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => this.n);
    document.addEventListener('reset-params', () => {
      this.sat = 100; this.n = '3'; s.value = 100; t.value = '3'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const hues = HUE_SETS[this.n];
    const x0 = 30, y0 = 40, bw = (w - 60) / hues.length, bh = h - 110;
    hues.forEach((hue, i) => {
      ctx.fillStyle = `hsl(${hue}, ${this.sat}%, 50%)`;
      ctx.fillRect(x0 + i * bw, y0, bw, bh);
      ctx.strokeStyle = theme.paperBg; ctx.lineWidth = 2; ctx.strokeRect(x0 + i * bw, y0, bw, bh);
    });
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, bw * hues.length, bh);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const msg = this.sat >= 90 ? (this.n === '3' ? 'the primary triad at full purity — the loudest hue contrast there is'
        : `${hues.length} pure hues — vivid, but the clash softens as hues crowd in`)
      : this.sat <= 25 ? 'drained of saturation, hue contrast all but vanishes into grey'
      : 'lower purity, weaker contrast — pure-hue contrast lives in saturation';
    ctx.fillText(msg, w / 2, h - 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new HuePure());
