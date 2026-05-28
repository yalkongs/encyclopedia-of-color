import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const COLS = 16, ROWS = 11;

class Synesthesia {
  private stage: CanvasStage;
  private view = 'normal';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.view = hydrateFromUrl('view') ?? 'normal';
    (document.getElementById('view') as EncToggle).value = this.view;
    registerStateParam('view', () => this.view);
    (document.getElementById('view') as EncToggle).addEventListener('change', (e) => {
      this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.view = 'normal';
      (document.getElementById('view') as EncToggle).value = 'normal';
      this.draw(); notifyStateChange();
    });
  }

  /** Cells forming a downward triangle carry the digit 2. */
  private isTwo(r: number, c: number): boolean {
    const top = 1, bottom = ROWS - 2;
    if (r < top || r > bottom) return false;
    const frac = (r - top) / (bottom - top);
    const half = frac * (COLS * 0.42);
    return Math.abs(c - (COLS - 1) / 2) <= half;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(0, 0, w, h);

    const pad = 36;
    const cw = (w - pad * 2) / COLS, ch = (h - pad * 2 - 30) / ROWS;
    const fs = Math.min(cw, ch) * 0.78;
    ctx.font = `${fs.toFixed(0)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    const syn = this.view === 'synesthete';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const two = this.isTwo(r, c);
        ctx.fillStyle = syn ? (two ? '#c0392b' : '#3a8f5a') : theme.ink;
        const x = pad + c * cw + cw / 2, y = pad + r * ch + ch / 2;
        ctx.fillText(two ? '2' : '5', x, y);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(syn ? 'the triangle of 2s pops out instantly' : 'a triangle of 2s is hidden here — can you find it?', pad, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Synesthesia());
