import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

const N_AVG = 1.55;

class Cholesteric {
  private stage: CanvasStage;
  private p = 330;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.p = hydrateNumber('p', 330);
    const s = document.getElementById('p') as EncSlider; s.value = this.p;
    s.addEventListener('input', (e) => { this.p = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('p', () => Math.round(this.p));
    document.addEventListener('reset-params', () => { this.p = 330; s.value = 330; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lam = N_AVG * this.p;
    const colour = wavelengthCss(Math.max(380, Math.min(700, lam)));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pitch p = ${this.p} nm · Bragg λ ≈ ${lam.toFixed(0)} nm (LH-circular)`, M, M);

    // Helicoid schematic
    const sx = M + 30, sy = M + 60, sw = 180, sh = 200;
    for (let i = 0; i < 12; i++) {
      const a = i * 0.5;
      const x1 = sx + 20 + Math.cos(a) * 50;
      const y = sy + i * 16;
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x1, y); g.lineTo(sx + sw - 20 - Math.cos(a) * 50, y); g.stroke();
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('chitin helicoid (Bouligand)', sx + sw / 2, sy + sh + 14);

    // Beetle silhouette filled with colour
    const bx = sx + sw + 50, by = M + 60;
    g.fillStyle = colour;
    g.beginPath(); g.ellipse(bx + 100, by + 80, 100, 70, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // legs
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(bx + 60 + i * 30, by + 130); g.lineTo(bx + 50 + i * 30, by + 170); g.stroke();
      g.beginPath(); g.moveTo(bx + 60 + i * 30, by + 30); g.lineTo(bx + 50 + i * 30, by - 5); g.stroke();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Chrysina resplendens reflects ~50% of left-circular and ~50% of right-circular (rare achromatic case). Most cholesteric beetles reflect only one hand.', M, h - M);
  }
}

new Cholesteric();
