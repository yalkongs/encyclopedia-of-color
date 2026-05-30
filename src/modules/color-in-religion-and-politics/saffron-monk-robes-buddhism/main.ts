import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TRADS = [
  { name: 'Theravada (Thailand, Sri Lanka, Myanmar)', col: '#e08820', dye: 'turmeric / jackwood + saffron tone' },
  { name: 'Vajrayana (Tibet, Bhutan, Mongolia)', col: '#7a2820', dye: 'madder + bark + tannin → deep maroon' },
  { name: 'Zen (Japan, Korea)', col: '#3a3a3a', dye: 'tannin + iron mordant → grey-charcoal' },
];

class Saffron {
  private stage: CanvasStage;
  private t = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 1);
    const s = document.getElementById('t') as EncSlider; s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    document.addEventListener('reset-params', () => { this.t = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = TRADS[this.t - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name}`, M, M);
    g.font = '12px serif'; g.fillStyle = theme.inkAlpha(0.7);
    g.fillText(`dye: ${sel.dye}`, M, M + 18);

    // Three monks in a row, each in their tradition's colour, current one highlighted
    const baseY = M + 70, fw = (w - 2 * M) / 3, fh = h - 2 * M - 120;
    for (let i = 0; i < 3; i++) {
      const trad = TRADS[i];
      const x0 = M + i * fw;
      const focus = (i === this.t - 1);
      // Background panel
      if (focus) {
        g.fillStyle = 'rgba(0,0,0,0.04)'; g.fillRect(x0 + 6, baseY - 10, fw - 12, fh + 30);
      }
      // Head
      g.fillStyle = '#e8c6a8';
      g.beginPath(); g.arc(x0 + fw / 2, baseY + 20, 22, 0, Math.PI * 2); g.fill();
      // Shaved head — small dots
      g.fillStyle = 'rgba(0,0,0,0.2)';
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * Math.PI;
        const r = 16 + Math.random() * 4;
        g.beginPath(); g.arc(x0 + fw / 2 + Math.cos(a) * r, baseY + 20 + Math.sin(-a) * r, 0.8, 0, Math.PI * 2); g.fill();
      }
      // Robe
      g.fillStyle = trad.col;
      g.beginPath();
      g.moveTo(x0 + fw / 2 - 60, baseY + fh);
      g.lineTo(x0 + fw / 2 - 35, baseY + 50);
      g.lineTo(x0 + fw / 2 - 18, baseY + 42);
      g.lineTo(x0 + fw / 2 + 18, baseY + 42);
      g.lineTo(x0 + fw / 2 + 35, baseY + 50);
      g.lineTo(x0 + fw / 2 + 60, baseY + fh);
      g.closePath(); g.fill();
      // Fold over right shoulder (drape across chest)
      g.fillStyle = `rgba(0,0,0,0.2)`;
      g.beginPath();
      g.moveTo(x0 + fw / 2 - 40, baseY + 70);
      g.bezierCurveTo(x0 + fw / 2 - 20, baseY + 110, x0 + fw / 2 + 35, baseY + 105, x0 + fw / 2 + 45, baseY + 130);
      g.lineTo(x0 + fw / 2 + 50, baseY + 145);
      g.bezierCurveTo(x0 + fw / 2 + 20, baseY + 130, x0 + fw / 2 - 20, baseY + 130, x0 + fw / 2 - 35, baseY + 85);
      g.closePath(); g.fill();
      g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
      // Label
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 11px serif' : '11px serif'; g.textAlign = 'center';
      g.fillText(['Theravada', 'Vajrayana', 'Zen'][i], x0 + fw / 2, baseY + fh + 18);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same vow of poverty + same robe pattern, three locally cheap dye sources. The "Buddhist colour" varies because the dye economy varied.', M, h - M);
  }
}

new Saffron();
