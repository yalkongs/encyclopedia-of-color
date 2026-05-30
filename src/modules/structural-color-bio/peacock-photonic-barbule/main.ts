import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class Peacock {
  private stage: CanvasStage;
  private a = 170;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.a = hydrateNumber('a', 170);
    const s = document.getElementById('a') as EncSlider; s.value = this.a;
    s.addEventListener('input', (e) => { this.a = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('a', () => Math.round(this.a));
    document.addEventListener('reset-params', () => { this.a = 170; s.value = 170; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const peak = 2.8 * this.a; // empirical fit
    const colour = wavelengthCss(Math.max(380, Math.min(700, peak)));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`peacock barbule lattice a = ${this.a} nm · reflection peak λ = ${peak.toFixed(0)} nm`, M, M);

    // 2D lattice schematic
    const lx = M + 30, ly = M + 50;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const x = lx + c * 28, y = ly + r * 28;
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('melanin rods in keratin (2D lattice)', lx + 100, ly + 6 * 28 + 18);

    // Peacock eye-spot pattern
    const ex = lx + 280, ey = ly + 80;
    for (let r = 80; r > 0; r -= 12) {
      const t = r / 80;
      g.fillStyle = `rgba(${Math.round(parseInt(colour.match(/\d+/g)![0]) * (1-t*0.3))},${Math.round(parseInt(colour.match(/\d+/g)![1]) * (1-t*0.3))},${Math.round(parseInt(colour.match(/\d+/g)![2]) * (1-t*0.3))},${0.6+t*0.4})`;
      g.beginPath(); g.arc(ex, ey, r, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same molecule (melanin) across the feather — only the lattice constant varies — yet the eye-spot displays the full visible spectrum.', M, h - M);
  }
}

new Peacock();
