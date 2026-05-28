import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const BAR = 12;
function hash(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

class Rivalry {
  private stage: CanvasStage;
  private rate = 0.35;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.rate = hydrateNumber('rate', 0.35);
    (document.getElementById('rate') as EncSlider).value = this.rate;
    registerStateParam('rate', () => this.rate);
    (document.getElementById('rate') as EncSlider).addEventListener('input', (e) => {
      this.rate = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.rate = 0.35;
      (document.getElementById('rate') as EncSlider).value = 0.35;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private leftEye(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Red vertical grating.
    for (let i = 0; i < w; i += BAR) {
      ctx.fillStyle = (Math.floor(i / BAR) % 2 === 0) ? '#c0392b' : '#2a1414';
      ctx.fillRect(x + i, y, BAR, h);
    }
  }
  private rightEye(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Green horizontal grating.
    for (let j = 0; j < h; j += BAR) {
      ctx.fillStyle = (Math.floor(j / BAR) % 2 === 0) ? '#2f9e54' : '#142a18';
      ctx.fillRect(x, y + j, w, BAR);
    }
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(0, 0, w, h);

    // Small eye panels.
    const ew = w * 0.2, eh = h * 0.22, ey = 50;
    const lX = w * 0.12, rX = w * 0.68;
    this.leftEye(ctx, lX, ey, ew, eh);
    this.rightEye(ctx, rX, ey, ew, eh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(lX, ey, ew, eh); ctx.strokeRect(rX, ey, ew, eh);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('left eye', lX + ew / 2, ey - 8);
    ctx.fillText('right eye', rX + ew / 2, ey - 8);

    // Perceived panel — piecemeal mosaic driven by dominance D(t).
    const D = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.rate * t);
    const px = w * 0.3, py = ey + eh + 40, pw = w * 0.4, ph = h - py - 44;
    const cols = Math.ceil(pw / BAR), rows = Math.ceil(ph / BAR);
    for (let cj = 0; cj < cols; cj++) {
      for (let ci = 0; ci < rows; ci++) {
        const left = D > hash(cj, ci);
        const x = px + cj * BAR, y = py + ci * BAR;
        if (left) {
          ctx.fillStyle = (cj % 2 === 0) ? '#c0392b' : '#2a1414';
        } else {
          ctx.fillStyle = (ci % 2 === 0) ? '#2f9e54' : '#142a18';
        }
        ctx.fillRect(x, y, BAR, BAR);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4; ctx.strokeRect(px, py, cols * BAR, rows * BAR);
    ctx.fillStyle = theme.inkMute; ctx.fillText('what you perceive', px + pw / 2, py - 8);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    const dom = D > 0.62 ? 'red vertical dominant' : D < 0.38 ? 'green horizontal dominant' : 'mixed — piecemeal rivalry';
    ctx.fillText(dom, w / 2, h - 12);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Rivalry());
