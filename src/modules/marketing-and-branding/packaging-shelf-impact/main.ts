import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const CATEGORY_HUES = [10, 18, 25, 30, 12, 22, 28, 15]; // coffee category: red-brown range

function hsvCss(h: number, s: number, v: number): string {
  const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c;
  let r0 = 0, g0 = 0, b0 = 0;
  if (h < 60) [r0, g0, b0] = [c, x, 0];
  else if (h < 120) [r0, g0, b0] = [x, c, 0];
  else if (h < 180) [r0, g0, b0] = [0, c, x];
  else if (h < 240) [r0, g0, b0] = [0, x, c];
  else if (h < 300) [r0, g0, b0] = [x, 0, c];
  else [r0, g0, b0] = [c, 0, x];
  return `rgb(${Math.round((r0 + m) * 255)},${Math.round((g0 + m) * 255)},${Math.round((b0 + m) * 255)})`;
}

class Shelf {
  private stage: CanvasStage;
  private h0 = 180;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.h0 = hydrateNumber('h', 180);
    const s = document.getElementById('h') as EncSlider; s.value = this.h0;
    s.addEventListener('input', (e) => { this.h0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('h', () => Math.round(this.h0));
    document.addEventListener('reset-params', () => { this.h0 = 180; s.value = 180; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Category mean hue
    const meanCat = CATEGORY_HUES.reduce((a, b) => a + b, 0) / CATEGORY_HUES.length;
    // Hue distance
    let dh = Math.abs(this.h0 - meanCat);
    if (dh > 180) dh = 360 - dh;
    // First-fixation share (8 brands incl. our new one). Naive uniform = 1/9 = 11%.
    // Standout brand gets baseline + linear lift in dh
    const baseline = 1 / 9;
    const share = baseline + (dh / 180) * 0.35;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`brand hue ${this.h0}° · category mean ${meanCat.toFixed(0)}° · distance ${dh.toFixed(0)}° · share-of-fixations ${(share * 100).toFixed(0)} %`, M, M);

    // Shelf with 8 category boxes + 1 new brand at position 5
    const sx = M, sy = M + 40, sw = w - 2 * M, sh = 200;
    g.fillStyle = '#8a7050'; g.fillRect(sx, sy, sw, sh); // shelf wood
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, sw, sh);
    const items = 9;
    const itemW = (sw - 20) / items;
    for (let i = 0; i < items; i++) {
      const x = sx + 10 + i * itemW;
      const itemH = sh - 20;
      const y = sy + 10;
      let col: string;
      if (i === 4) {
        col = hsvCss(this.h0, 0.85, 0.85);
      } else {
        const idx = (i < 4) ? i : i - 1;
        col = hsvCss(CATEGORY_HUES[idx], 0.7, 0.6);
      }
      g.fillStyle = col; g.fillRect(x, y, itemW - 6, itemH);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x, y, itemW - 6, itemH);
      g.fillStyle = '#fff'; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(i === 4 ? 'YOU' : `c${i < 4 ? i + 1 : i}`, x + (itemW - 6) / 2, y + itemH - 8);
    }
    // Highlight new brand
    g.strokeStyle = theme.crimson; g.lineWidth = 3;
    const yx = sx + 10 + 4 * itemW;
    g.strokeRect(yx, sy + 10, itemW - 6, sh - 20);

    // Bar chart of fixation share
    const cy = sy + sh + 30, ch = 60;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(sx, cy, sw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('first-fixation share', sx, cy - 4);
    const bw = sw / 9;
    for (let i = 0; i < 9; i++) {
      const s0 = (i === 4) ? share : (1 - share) / 8;
      const bh = s0 * ch / 0.5;
      g.fillStyle = (i === 4) ? theme.crimson : '#888';
      g.fillRect(sx + i * bw + 4, cy + ch - bh, bw - 8, bh);
      g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${(s0 * 100).toFixed(0)}%`, sx + i * bw + bw / 2, cy + ch - bh - 4);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Eye-tracking in CPG aisles: 2-2-2 rule — 2 s per category, 2 fixations, 2 categories scanned before purchase.', M, h - M);
  }
}

new Shelf();
