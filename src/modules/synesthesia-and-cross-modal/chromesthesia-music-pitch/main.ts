import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCRIABIN_COLORS = [
  '#c2382c', '#a8329e', '#c8a020', '#8a6038', '#aac8e0', '#5a2a80', '#1a6a3a',
  '#f08020', '#8a6a90', '#1a5050', '#2030a0', '#c8d8e8',
];

class Chrom {
  private stage: CanvasStage;
  private n = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 0);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = NOTES[this.n];
    const col = SCRIABIN_COLORS[this.n];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`note "${sel}" → Scriabin colour ${col}`, M, M);

    // Big swatch with note glyph
    const sx = M, sy = M + 30, sw = 280, sh = 240;
    g.fillStyle = col; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = '#fff'; g.font = 'bold 120px serif'; g.textAlign = 'center';
    g.fillText(sel, sx + sw / 2, sy + sh - 40);

    // Piano keyboard with chromesthesia colours
    const px = sx + sw + 30, py = sy + 20, pw = w - px - M, ph = 180;
    const whiteCount = 7;
    const whiteW = pw / whiteCount;
    const whiteNoteIdx = [0, 2, 4, 5, 7, 9, 11];
    for (let i = 0; i < whiteCount; i++) {
      const x = px + i * whiteW;
      g.fillStyle = SCRIABIN_COLORS[whiteNoteIdx[i]];
      g.fillRect(x, py, whiteW - 2, ph);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x, py, whiteW - 2, ph);
      if (whiteNoteIdx[i] === this.n) { g.strokeStyle = theme.crimson; g.lineWidth = 2; g.strokeRect(x, py, whiteW - 2, ph); }
      g.fillStyle = '#fff'; g.font = 'bold 12px serif'; g.textAlign = 'center';
      g.fillText(NOTES[whiteNoteIdx[i]], x + whiteW / 2, py + ph - 10);
    }
    // Black keys
    const blackPositions = [0, 1, 3, 4, 5];
    const blackNoteIdx = [1, 3, 6, 8, 10];
    const bkW = whiteW * 0.6, bkH = ph * 0.6;
    for (let i = 0; i < blackPositions.length; i++) {
      const x = px + (blackPositions[i] + 1) * whiteW - bkW / 2;
      g.fillStyle = SCRIABIN_COLORS[blackNoteIdx[i]];
      g.fillRect(x, py, bkW - 2, bkH);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x, py, bkW - 2, bkH);
      if (blackNoteIdx[i] === this.n) { g.strokeStyle = theme.crimson; g.lineWidth = 2; g.strokeRect(x, py, bkW - 2, bkH); }
      g.fillStyle = '#fff'; g.font = 'bold 11px serif'; g.textAlign = 'center';
      g.fillText(NOTES[blackNoteIdx[i]], x + bkW / 2 - 1, py + bkH - 8);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Scriabin colour-piano (1910)', px + pw / 2, py + ph + 18);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Chromesthesia (~0.2 %) maps pitch + timbre to colour. Often correlates with grapheme synesthesia (C-note ↔ C-letter mappings).', M, h - M);
  }
}

new Chrom();
