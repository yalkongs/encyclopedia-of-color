import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { apcaContrast } from '@core/math/apca';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const grey = (L: number): [number, number, number] => { const v = Math.round(255 * Math.pow(L / 100, 1 / 2.2)); return [v, v, v]; };
// approx min |Lc| for a passable 18px body at each weight (APCA Bronze flavour)
const WEIGHTS: Array<[number, number]> = [[100, 100], [300, 90], [400, 75], [600, 62], [900, 48]];
const BG: [number, number, number] = [248, 248, 248];

class WeightContrast {
  private stage: CanvasStage;
  private lc = 55;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lc = hydrateNumber('lc', 55);
    const s = document.getElementById('lc') as EncSlider;
    s.value = this.lc;
    s.addEventListener('input', (e) => { this.lc = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lc', () => Math.round(this.lc));
    document.addEventListener('reset-params', () => { this.lc = 55; s.value = 55; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const txt = grey(this.lc);
    const lc = Math.abs(apcaContrast(txt, BG));
    ctx.fillStyle = `rgb(${BG.join(',')})`; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = theme.crimson; ctx.font = '700 22px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`APCA Lc ${lc.toFixed(0)} · 18px body`, 30, 44);

    const rowH = (h - 90) / WEIGHTS.length, y0 = 64;
    WEIGHTS.forEach(([wt, thr], i) => {
      const y = y0 + i * rowH;
      const pass = lc >= thr;
      ctx.fillStyle = `rgb(${txt.join(',')})`; ctx.font = `${wt} 18px Inter, sans-serif`; ctx.textAlign = 'left';
      ctx.fillText('The quick brown fox jumps over the lazy dog', 30, y + rowH / 2 + 6);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(`${wt}`, 30, y + rowH / 2 - 14);
      // badge
      const bx = w - 150;
      ctx.fillStyle = pass ? theme.slate : theme.crimson; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(pass ? `✓ passes (≥${thr})` : `✕ needs Lc ${thr}`, bx, y + rowH / 2 + 4);
      ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, y + rowH - 4); ctx.lineTo(w - 30, y + rowH - 4); ctx.stroke();
    });
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('lower the contrast and the thin weights fail first — heavy strokes need far less Lc', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new WeightContrast());
