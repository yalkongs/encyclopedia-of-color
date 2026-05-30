import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TYPES = [
  { name: 'grapheme-colour', prev: 1.4, desc: 'letters/numbers trigger colour percept' },
  { name: 'weekday-colour', prev: 0.9, desc: 'each day of the week has its own colour' },
  { name: 'time-units-colour', prev: 0.6, desc: 'months / years trigger colour' },
  { name: 'chromesthesia', prev: 0.2, desc: 'sound triggers colour' },
  { name: 'lexical-gustatory', prev: 0.2, desc: 'words trigger taste' },
  { name: 'ordinal-personification', prev: 0.1, desc: 'numbers have personalities/genders' },
  { name: 'mirror-touch', prev: 1.6, desc: 'seeing touch triggers touch sensation' },
];

class Prevalence {
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
    const sel = TYPES[this.t - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`focus: ${sel.name} — ${sel.prev}% of population`, M, M);
    g.font = '12px serif'; g.fillStyle = theme.inkAlpha(0.75);
    g.fillText(sel.desc, M, M + 18);

    // Bar chart by type
    const bx = M, by = M + 60, bw = w - 2 * M, bh = 240;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
    const maxP = 2;
    const colW = bw / TYPES.length;
    for (let i = 0; i < TYPES.length; i++) {
      const x = bx + i * colW;
      const cH = (TYPES[i].prev / maxP) * bh;
      const focus = (i === this.t - 1);
      g.fillStyle = focus ? theme.crimson : '#888';
      g.fillRect(x + 8, by + bh - cH, colW - 16, cH);
      g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${TYPES[i].prev}%`, x + colW / 2, by + bh - cH - 4);
      // Type label (wrap)
      const words = TYPES[i].name.split('-');
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.7);
      g.font = focus ? 'bold 11px serif' : '10px serif';
      for (let l = 0; l < words.length; l++) {
        g.fillText(words[l], x + colW / 2, by + bh + 14 + l * 12);
      }
    }
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'left';
    g.fillText('% of population (Simner et al. 2006, n=1,190)', bx, by - 4);

    // Sum line
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(bx, by + bh - (4.4 / maxP) * bh); g.lineTo(bx + bw, by + bh - (4.4 / maxP) * bh); g.stroke(); g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'right';
    g.fillText('total ≥1 type: 4.4%', bx + bw - 6, by + bh - (4.4 / maxP) * bh - 4);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Synesthesia clusters in families (~50% heritable). Often associated with creative professions and absolute pitch.', M, h - M);
  }
}

new Prevalence();
