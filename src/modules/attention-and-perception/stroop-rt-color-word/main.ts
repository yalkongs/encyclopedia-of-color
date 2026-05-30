import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const WORDS = [
  { txt: 'RED', col: '#c2382c' },
  { txt: 'BLUE', col: '#1f3a8a' },
  { txt: 'GREEN', col: '#1a6a3a' },
  { txt: 'YELLOW', col: '#c8a020' },
  { txt: 'PURPLE', col: '#5a2a82' },
];

class Stroop {
  private stage: CanvasStage;
  private c = 0.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 0.5);
    const s = document.getElementById('c') as EncSlider; s.value = this.c;
    s.addEventListener('input', (e) => { this.c = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('c', () => this.c.toFixed(2));
    document.addEventListener('reset-params', () => { this.c = 0.5; s.value = 0.5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Expected RT model
    const rtCong = 600;
    const rtIncong = 850;
    const meanRT = rtCong * (1 - this.c) + rtIncong * this.c;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`proportion incongruent = ${(this.c * 100).toFixed(0)} % · expected RT ≈ ${Math.round(meanRT)} ms`, M, M);

    // Word grid
    const rows = 5, cols = 6;
    const gx = M, gy = M + 40, cw = (w - 2 * M) / cols, ch = 50;
    // Deterministic LCG for stable pattern
    let seed = 12345;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wordIdx = Math.floor(rng() * WORDS.length);
      const isIncong = rng() < this.c;
      let colIdx = wordIdx;
      if (isIncong) {
        do { colIdx = Math.floor(rng() * WORDS.length); } while (colIdx === wordIdx);
      }
      const word = WORDS[wordIdx];
      const col = WORDS[colIdx].col;
      g.fillStyle = col; g.font = 'bold 24px serif'; g.textAlign = 'center';
      g.fillText(word.txt, gx + c * cw + cw / 2, gy + r * ch + ch / 2 + 8);
    }

    // RT chart
    const by = gy + rows * ch + 30;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('expected RT (ms) — congruent vs incongruent', M, by);
    const bx = M, bh = 100, bw = w - 2 * M;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(bx, by + 20, bw, bh);
    const X = (cc: number) => bx + cc * bw;
    const Y = (rt: number) => by + 20 + (1 - (rt - 500) / 500) * bh;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let cc = 0; cc <= 1.0; cc += 0.02) {
      const rt = rtCong * (1 - cc) + rtIncong * cc;
      const x = X(cc), y = Y(rt);
      if (cc === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.c), Y(meanRT), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('0 % incong (600 ms)', bx, by + 20 + bh + 14);
    g.textAlign = 'right'; g.fillText('100 % incong (850 ms)', bx + bw, by + 20 + bh + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Stroop interference is robust to all reading-fluent populations. Hindi-Devanagari speakers show Stroop in Hindi but not in English.', M, h - M);
  }
}

new Stroop();
