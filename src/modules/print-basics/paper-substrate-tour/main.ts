import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type Stock = { name: string; paper: [number, number, number]; contrast: number; warm: number };
const STOCKS: Stock[] = [
  { name: 'coated gloss',  paper: [252, 250, 245], contrast: 1.00, warm: 0 },
  { name: 'uncoated white', paper: [246, 242, 230], contrast: 0.86, warm: 0.4 },
  { name: 'newsprint',      paper: [236, 222, 195], contrast: 0.62, warm: 1.0 },
];
// reference inks at full strength on coated stock
const SWATCHES = [
  { name: 'shadow',    rgb: [ 22,  22,  22] },
  { name: 'cyan',      rgb: [  0, 159, 218] },
  { name: 'magenta',   rgb: [232,   0, 138] },
  { name: 'yellow',    rgb: [254, 221,   0] },
  { name: 'skin tone', rgb: [223, 167, 138] },
];

function rgb(c: number[]): string { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

class PaperTour {
  private stage: CanvasStage;
  private exag = 2;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.exag = hydrateNumber('exag', 2);
    const s = document.getElementById('exag') as EncSlider;
    s.value = this.exag;
    s.addEventListener('input', (e) => { this.exag = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('exag', () => Math.round(this.exag));
    document.addEventListener('reset-params', () => { this.exag = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  // apply stock's paper white + contrast loss + warm tint
  private onStock(ink: number[], st: Stock): [number, number, number] {
    const k = this.exag, c = 1 - (1 - st.contrast) * k;
    const wr = st.warm * k * 14, wg = st.warm * k * 6, wb = -st.warm * k * 18;
    // contract toward paper (loss of shadow), then add warm tint
    const p = st.paper;
    const r = p[0] + (ink[0] - p[0]) * c + wr;
    const g = p[1] + (ink[1] - p[1]) * c + wg;
    const b = p[2] + (ink[2] - p[2]) * c + wb;
    return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#22201c'; ctx.fillRect(0, 0, w, h);
    const pad = 36, gap = 22, cols = 3, colW = (w - pad * 2 - gap * 2) / cols;
    const py0 = 70, ph = h - 160;
    STOCKS.forEach((st, i) => {
      const cx = pad + i * (colW + gap);
      // paper rectangle (the stock itself)
      ctx.fillStyle = rgb(this.onStock([255, 255, 255], st));
      ctx.fillRect(cx, py0, colW, ph);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(cx, py0, colW, ph);
      ctx.fillStyle = '#e6e3da'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(st.name, cx + colW / 2, py0 - 14);
      // ink swatches stacked on the paper
      const rowH = (ph - 30) / SWATCHES.length;
      SWATCHES.forEach((sw, k) => {
        const y = py0 + 15 + k * rowH;
        ctx.fillStyle = rgb(this.onStock(sw.rgb, st));
        ctx.fillRect(cx + 14, y, colW - 28, rowH - 12);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(sw.name, cx + 18, y + 14);
      });
    });
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.exag === 1
      ? 'at 1× the real differences are subtle — same swatches, three substrates'
      : `${this.exag}× exaggeration — coated stays clean, uncoated softens, newsprint warms and crushes the shadow`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PaperTour());
