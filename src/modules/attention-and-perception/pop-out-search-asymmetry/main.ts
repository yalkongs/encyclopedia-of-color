import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PopOut {
  private stage: CanvasStage;
  private n = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 20);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 20; s.value = 20; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const rtFeature = 450; // flat
    const rtConj = 400 + 40 * this.n; // ~40 ms / item

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`n = ${this.n} · feature search ≈ ${rtFeature} ms · conjunction search ≈ ${rtConj} ms`, M, M);

    // Two stim arrays side by side
    const arrW = (w - 2 * M) / 2 - 20, arrH = (h - 2 * M) * 0.45;
    const ax = M, bx = M + arrW + 40;
    const ay = M + 40;

    let seed = 12345;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };

    // Feature search panel: red circle among green circles
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(ax, ay, arrW, arrH);
    const targetA = Math.floor(rng() * this.n);
    for (let i = 0; i < this.n; i++) {
      const px = ax + 20 + rng() * (arrW - 40);
      const py = ay + 20 + rng() * (arrH - 40);
      const col = (i === targetA) ? '#c2382c' : '#1a6a3a';
      g.fillStyle = col;
      g.beginPath(); g.arc(px, py, 8, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('feature search (red among greens)', ax + arrW / 2, ay + arrH + 16);

    // Reset RNG and draw conjunction panel
    seed = 12345;
    const rng2 = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, ay, arrW, arrH);
    const targetB = Math.floor(rng2() * this.n);
    for (let i = 0; i < this.n; i++) {
      const px = bx + 20 + rng2() * (arrW - 40);
      const py = ay + 20 + rng2() * (arrH - 40);
      // Distractors: red circles OR green squares
      const isRed = rng2() > 0.5;
      const shape = isRed ? 'circle' : 'square';
      let col = isRed ? '#c2382c' : '#1a6a3a';
      let shp = shape;
      if (i === targetB) {
        // Target: red square
        col = '#c2382c'; shp = 'square';
      }
      g.fillStyle = col;
      if (shp === 'circle') {
        g.beginPath(); g.arc(px, py, 8, 0, Math.PI * 2); g.fill();
      } else {
        g.fillRect(px - 7, py - 7, 14, 14);
      }
    }
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('conjunction search (red square among red circles + green squares)', bx + arrW / 2, ay + arrH + 16);

    // RT chart
    const cy = ay + arrH + 50, cx = M, cw = w - 2 * M, ch = 90;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('RT vs set size — flat (feature) vs linear (conjunction)', cx, cy - 6);
    const X = (n: number) => cx + ((n - 5) / 35) * cw;
    const Y = (rt: number) => cy + (1 - (rt - 400) / 1400) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    g.moveTo(X(5), Y(450)); g.lineTo(X(40), Y(450)); g.stroke();
    g.strokeStyle = '#1f3a8a'; g.beginPath();
    for (let nn = 5; nn <= 40; nn++) {
      const rt = 400 + 40 * nn;
      const x = X(nn), y = Y(rt);
      if (nn === 5) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.n), Y(450), 5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(X(this.n), Y(rtConj), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.65); g.font = '10px serif';
    g.textAlign = 'left'; g.fillText('n=5', cx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('n=40', cx + cw, cy + ch + 14);
    g.fillStyle = theme.crimson; g.fillText('feature (flat)', cx + 14, cy + 14);
    g.fillStyle = '#1f3a8a'; g.fillText('conjunction (linear)', cx + 14, cy + 28);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Feature search is what enables a single red dot on a dashboard to grab attention regardless of clutter.', M, h - M);
  }
}

new PopOut();
