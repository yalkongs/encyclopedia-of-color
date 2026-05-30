import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface White {
  name: string;
  formula: string;
  n: number;
  hue: string;
  toxic: string;
  era: string;
}

const WHITES: White[] = [
  { name: 'lead white', formula: '2 PbCO₃·Pb(OH)₂', n: 2.0, hue: '#f4ecdf', toxic: 'highly toxic — banned in EU 2018', era: 'Roman → 1900' },
  { name: 'zinc white', formula: 'ZnO', n: 2.0, hue: '#f0f0f5', toxic: 'low toxicity but cracks oil films', era: '1834 →' },
  { name: 'titanium white', formula: 'TiO₂ (rutile)', n: 2.7, hue: '#fcfcfc', toxic: 'non-toxic; the modern standard', era: '1920 →' },
];

class LeadWhite {
  private stage: CanvasStage;
  private p = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.p = hydrateNumber('p', 1);
    const s = document.getElementById('p') as EncSlider; s.value = this.p;
    s.addEventListener('input', (e) => { this.p = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('p', () => Math.round(this.p));
    document.addEventListener('reset-params', () => { this.p = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = WHITES[this.p - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} · ${sel.formula} · n = ${sel.n} · ${sel.era}`, M, M);

    // Flesh-tone test (Vermeer style highlight)
    const fx = M, fy = M + 30, fw = (w - 2 * M) * 0.5, fh = h - 2 * M - 90;
    // Dark background
    g.fillStyle = '#2a1a14'; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(fx, fy, fw, fh);
    // Cheek highlight gradient (white pigment over flesh)
    const grad = g.createRadialGradient(fx + fw * 0.5, fy + fh * 0.4, 6, fx + fw * 0.5, fy + fh * 0.4, fh * 0.4);
    grad.addColorStop(0, sel.hue);
    grad.addColorStop(0.3, '#d8a890');
    grad.addColorStop(0.7, '#7a4838');
    grad.addColorStop(1, '#2a1a14');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(fx + fw * 0.5, fy + fh * 0.5, fw * 0.32, fh * 0.45, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('flesh-tone highlight (Vermeer-style)', fx + fw / 2, fy + fh + 16);

    // Comparison panel (right)
    const sx = fx + fw + 30, sy = fy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('three white pigments', sx, sy);

    for (let i = 0; i < WHITES.length; i++) {
      const yy = sy + 20 + i * 80;
      const focus = (i === this.p - 1);
      // Swatch
      g.fillStyle = WHITES[i].hue;
      g.fillRect(sx, yy, 50, 60);
      g.strokeStyle = focus ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = focus ? 2 : 1;
      g.strokeRect(sx, yy, 50, 60);
      // Label
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 12px serif' : '12px serif'; g.textAlign = 'left';
      g.fillText(`${WHITES[i].name}  (n=${WHITES[i].n})`, sx + 60, yy + 12);
      g.font = '11px serif';
      g.fillText(WHITES[i].formula, sx + 60, yy + 26);
      g.fillStyle = focus ? theme.crimson : theme.inkAlpha(0.5);
      g.fillText(WHITES[i].toxic, sx + 60, yy + 42);
      g.fillStyle = focus ? theme.inkAlpha(0.7) : theme.inkAlpha(0.4);
      g.fillText(`era: ${WHITES[i].era}`, sx + 60, yy + 56);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Lead white\'s 500-year reign ended when titanium dioxide (1920) matched its opacity without the poisoning.', M, h - M);
  }
}

new LeadWhite();
