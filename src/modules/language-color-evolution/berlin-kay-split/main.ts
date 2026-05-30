import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Term { name: string; rgb: [number, number, number]; minStage: number; }
const TERMS: Term[] = [
  { name: 'white',  rgb: [240, 240, 235], minStage: 1 },
  { name: 'black',  rgb: [25, 25, 25],    minStage: 1 },
  { name: 'red',    rgb: [195, 50, 50],   minStage: 2 },
  { name: 'green',  rgb: [70, 150, 70],   minStage: 3 },
  { name: 'yellow', rgb: [230, 200, 50],  minStage: 3 },
  { name: 'blue',   rgb: [60, 90, 200],   minStage: 5 },
  { name: 'brown',  rgb: [110, 70, 40],   minStage: 6 },
  { name: 'purple', rgb: [130, 60, 160],  minStage: 7 },
  { name: 'pink',   rgb: [230, 150, 180], minStage: 7 },
  { name: 'orange', rgb: [230, 130, 50],  minStage: 7 },
  { name: 'grey',   rgb: [140, 140, 140], minStage: 7 },
];

class BerlinKay {
  private stage: CanvasStage;
  private bkStage = 7;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bkStage = hydrateNumber('bk', 7);
    const s = document.getElementById('bk') as EncSlider; s.value = this.bkStage;
    s.addEventListener('input', (e) => { this.bkStage = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('bk', () => Math.round(this.bkStage));
    document.addEventListener('reset-params', () => { this.bkStage = 7; s.value = 7; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Berlin-Kay stage ${this.bkStage} — vocabulary at this stage`, M, M);

    // Grid of all 11 terms
    const sy = M + 40;
    const cols = 4;
    const cw = (w - 2 * M) / cols;
    const ch = 90;
    for (let i = 0; i < TERMS.length; i++) {
      const t = TERMS[i];
      const cx = M + (i % cols) * cw;
      const cy = sy + Math.floor(i / cols) * ch;
      const has = this.bkStage >= t.minStage;
      g.fillStyle = has ? `rgb(${t.rgb[0]},${t.rgb[1]},${t.rgb[2]})` : '#e0dccf';
      g.fillRect(cx + 4, cy, cw - 8, ch - 14);
      g.strokeStyle = has ? theme.inkAlpha(0.5) : theme.inkAlpha(0.25);
      g.strokeRect(cx + 4, cy, cw - 8, ch - 14);
      g.fillStyle = has ? theme.ink : theme.inkAlpha(0.5);
      g.font = '12px serif'; g.textAlign = 'center';
      g.fillText(`${t.name} ${has ? '' : '(stage ' + t.minStage + ')'}`, cx + cw / 2, cy + ch - 2);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('B&K\'s strict ordering: a language with "blue" must also have "red"; "purple" implies all earlier terms. Universal across cultures.', M, h - M);
  }
}

new BerlinKay();
