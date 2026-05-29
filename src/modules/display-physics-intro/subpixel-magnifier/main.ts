import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const BARS: Array<[number, number, number]> = [
  [255, 255, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255],
  [0, 255, 255], [255, 0, 255], [255, 255, 0], [128, 128, 128],
];
const NAMES = ['white', 'red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'grey'];

class SubpixelMag {
  private stage: CanvasStage;
  private zoom = 34;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.zoom = hydrateNumber('zoom', 34);
    const s = document.getElementById('zoom') as EncSlider;
    s.value = this.zoom;
    s.addEventListener('input', (e) => { this.zoom = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('zoom', () => Math.round(this.zoom));
    document.addEventListener('reset-params', () => { this.zoom = 34; s.value = 34; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, w, h);
    const px = this.zoom; // pixel size
    const x0 = 30, y0 = 40, gridW = w - 60, gridH = h - 90;
    const cols = Math.floor(gridW / px), rows = Math.floor(gridH / px);
    const barW = cols / BARS.length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bar = BARS[Math.min(BARS.length - 1, Math.floor(c / barW))];
        const cx = x0 + c * px, cy = y0 + r * px;
        if (px >= 14) {
          // draw three subpixel stripes
          const sw = px / 3;
          ctx.fillStyle = `rgb(${bar[0]},0,0)`; ctx.fillRect(cx, cy, sw - 0.5, px - 1);
          ctx.fillStyle = `rgb(0,${bar[1]},0)`; ctx.fillRect(cx + sw, cy, sw - 0.5, px - 1);
          ctx.fillStyle = `rgb(0,0,${bar[2]})`; ctx.fillRect(cx + 2 * sw, cy, sw - 0.5, px - 1);
        } else {
          ctx.fillStyle = `rgb(${bar[0]},${bar[1]},${bar[2]})`; ctx.fillRect(cx, cy, px, px);
        }
      }
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, cols * px, rows * px);
    // labels
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    NAMES.forEach((n, i) => ctx.fillText(n, x0 + (i + 0.5) * barW * px, y0 - 8));
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(px >= 14 ? 'magnified — each pixel is three lit/dark stripes' : 'near life size — the stripes fuse into solid colour', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new SubpixelMag());
