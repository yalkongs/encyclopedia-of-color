import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const THRESHOLD = 1.05; // V
const PEAK = 1.25;
const DECAY_END = 1.55;

function output(V: number): number {
  if (V < THRESHOLD) return 0;
  if (V <= PEAK) return (V - THRESHOLD) / (PEAK - THRESHOLD);
  if (V <= DECAY_END) return 1 - (V - PEAK) / (DECAY_END - PEAK) * 0.8;
  return 0.2;
}

class ECL {
  private stage: CanvasStage;
  private V = 120;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.V = hydrateNumber('V', 120);
    const s = document.getElementById('V') as EncSlider; s.value = this.V;
    s.addEventListener('input', (e) => { this.V = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('V', () => Math.round(this.V));
    document.addEventListener('reset-params', () => { this.V = 120; s.value = 120; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const vV = this.V / 100;
    const I = output(vV);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`E = ${vV.toFixed(2)} V vs Ag/AgCl · normalised ECL intensity = ${I.toFixed(2)}`, M, M);

    // Electrochemical cell schematic (left)
    const cx = M + 30, cy = M + 50, cw = 280, ch = 220;
    g.fillStyle = '#dbe7ee';
    g.fillRect(cx, cy, cw, ch);
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2;
    g.strokeRect(cx, cy, cw, ch);
    // Electrode (left)
    g.fillStyle = '#888'; g.fillRect(cx + 30, cy + 30, 12, ch - 60);
    g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('Pt electrode', cx + 36, cy + ch - 10);
    // ECL glow at the electrode surface
    if (I > 0.05) {
      const grad = g.createRadialGradient(cx + 42, cy + ch / 2, 0, cx + 42, cy + ch / 2, 90);
      grad.addColorStop(0, `rgba(255,130,40,${0.85 * I})`);
      grad.addColorStop(1, 'rgba(255,130,40,0)');
      g.fillStyle = grad;
      g.fillRect(cx + 30, cy + 30, 200, ch - 60);
    }
    // Ru(bipy)3 markers
    g.fillStyle = '#a3132d';
    for (let i = 0; i < 12; i++) {
      const x = cx + 60 + (i % 4) * 50;
      const y = cy + 50 + Math.floor(i / 4) * 50;
      g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'right';
    g.fillText(I > 0.5 ? '[Ru(bipy)₃]²⁺*' : '[Ru(bipy)₃]²⁺', cx + cw - 6, cy + 20);

    // I-V curve (right)
    const px = cx + cw + 50, py = cy, pw = w - px - M, ph = ch;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('ECL intensity vs applied potential', px + pw / 2, py - 6);
    g.fillText('V vs Ag/AgCl', px + pw / 2, py + ph + 16);

    const X = (V: number) => px + ((V - 0.8) / 0.8) * pw;
    const Y = (i: number) => py + (1 - i) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let V = 0.8; V <= 1.6; V += 0.005) {
      const X0 = X(V), Y0 = Y(output(V));
      if (V === 0.8) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(vV), Y(I), 5, 0, Math.PI * 2); g.fill();

    // Threshold marker
    g.strokeStyle = theme.gold; g.setLineDash([4, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(THRESHOLD), py); g.lineTo(X(THRESHOLD), py + ph); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.gold; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('threshold', X(THRESHOLD), py - 4);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif';
    for (const V of [0.9, 1.1, 1.3, 1.5]) g.fillText(V.toFixed(1), X(V), py + ph + 30);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Roche\'s Elecsys clinical analyser uses Ru-ECL for >25 immunoassays — light from electrodes is much cleaner than fluorescent labels.', M, h - M);
  }
}

new ECL();
