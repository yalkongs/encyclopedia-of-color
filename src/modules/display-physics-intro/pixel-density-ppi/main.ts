import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function deviceLabel(ppi: number): string {
  if (ppi < 80) return 'old CRT / projector';
  if (ppi < 120) return 'standard desktop monitor';
  if (ppi < 180) return 'sharp laptop';
  if (ppi < 280) return 'retina laptop / tablet';
  if (ppi < 400) return 'flagship phone';
  return 'premium phone (grid invisible)';
}

class PixelDensity {
  private stage: CanvasStage;
  private ppi = 96;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ppi = hydrateNumber('ppi', 96);
    const s = document.getElementById('ppi') as EncSlider;
    s.value = this.ppi;
    s.addEventListener('input', (e) => { this.ppi = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ppi', () => Math.round(this.ppi));
    document.addEventListener('reset-params', () => { this.ppi = 96; s.value = 96; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paper; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 40, side = Math.min(w - 60, h - 100);
    // cell size: low PPI → big cells. Map 48..460 → 22..2 px
    const cell = Math.max(2, 24 - (this.ppi - 48) / 412 * 22);
    const N = Math.floor(side / cell);
    const cx = N / 2, cy = N / 2, R = N * 0.4;
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        // coverage of a circle ring + diagonal stroke
        const dx = gx + 0.5 - cx, dy = gy + 0.5 - cy, d = Math.hypot(dx, dy);
        const onRing = Math.abs(d - R) < 0.9;
        const onDiag = Math.abs((gx - gy)) < 1.0;
        const ink = onRing || onDiag;
        ctx.fillStyle = ink ? '#1a1a22' : '#f6f4ee';
        ctx.fillRect(x0 + gx * cell, y0 + gy * cell, cell + 0.4, cell + 0.4);
      }
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, N * cell, N * cell);
    ctx.fillStyle = theme.crimson; ctx.font = '700 22px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`${this.ppi} PPI`, x0 + N * cell + 30, y0 + 30);
    ctx.fillStyle = theme.inkSoft; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(deviceLabel(this.ppi), x0 + N * cell + 30, y0 + 54);
    ctx.fillStyle = theme.goldDeep; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`${cell.toFixed(1)} px per cell`, x0 + N * cell + 30, y0 + 80);
  }
}
window.addEventListener('DOMContentLoaded', () => new PixelDensity());
