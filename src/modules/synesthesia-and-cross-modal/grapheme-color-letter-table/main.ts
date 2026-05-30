import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Modal Day-Goff data on grapheme-colour mappings
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COLOURS: string[] = [
  '#c2382c', '#2050a8', '#c8a020', '#8a4818', '#1a6a3a', '#c8a020', '#506050', '#888888',
  '#f0e8d0', '#c8c020', '#aa8040', '#6a4a30', '#a82828', '#1a3a8a', '#f8f4ec', '#9020a8',
  '#5050a8', '#c83820', '#c8a020', '#3a3a3a', '#5a4830', '#7a4820', '#f8f4ec', '#202020',
  '#c8a020', '#202028',
];

class Grapheme {
  private stage: CanvasStage;
  private i = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.i = hydrateNumber('i', 0);
    const s = document.getElementById('i') as EncSlider; s.value = this.i;
    s.addEventListener('input', (e) => { this.i = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('i', () => Math.round(this.i));
    document.addEventListener('reset-params', () => { this.i = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = LETTERS[this.i];
    const col = COLOURS[this.i];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`focus letter: "${sel}" → ${col}`, M, M);

    // Big focus glyph
    const fx = M, fy = M + 30, fw = 240, fh = 240;
    g.fillStyle = col; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(fx, fy, fw, fh);
    g.fillStyle = '#fff'; g.font = 'bold 160px serif'; g.textAlign = 'center';
    g.fillText(sel, fx + fw / 2, fy + fh - 30);

    // Letter grid (5×6 = 30 cells; only 26 used)
    const gx = fx + fw + 30, gy = fy;
    const cols = 6, rows = 5;
    const cellW = (w - gx - M) / cols, cellH = fh / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= 26) break;
      const lx = gx + c * cellW, ly = gy + r * cellH;
      g.fillStyle = COLOURS[idx]; g.fillRect(lx, ly, cellW - 2, cellH - 2);
      g.strokeStyle = (idx === this.i) ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = (idx === this.i) ? 2 : 1;
      g.strokeRect(lx, ly, cellW - 2, cellH - 2);
      g.fillStyle = '#fff'; g.font = 'bold 20px serif'; g.textAlign = 'center';
      g.fillText(LETTERS[idx], lx + (cellW - 2) / 2, ly + (cellH - 2) / 2 + 8);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Specific mappings vary, but groups share preferences: A=red, O=white/yellow, Z=black across many synesthetes — Fisher-Price magnet trace.', M, h - M);
  }
}

new Grapheme();
