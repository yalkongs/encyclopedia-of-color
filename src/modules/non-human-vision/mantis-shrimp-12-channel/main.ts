import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

// Approximate λ_max for the 12 mid-band photoreceptors (Cronin 1989, simplified)
const LAMBDAS = [310, 330, 360, 390, 425, 460, 495, 525, 560, 590, 620, 690];

class MantisShrimp {
  private stage: CanvasStage;
  private hi = 6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hi = hydrateNumber('hi', 6);
    const s = document.getElementById('hi') as EncSlider; s.value = this.hi;
    s.addEventListener('input', (e) => { this.hi = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hi', () => Math.round(this.hi));
    document.addEventListener('reset-params', () => { this.hi = 6; s.value = 6; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`mantis shrimp · highlighted channel #${this.hi} at λ_max = ${LAMBDAS[this.hi - 1]} nm`, M, M);

    // Spectrum strip
    const sy = M + 30, sx = M, sw = w - 2 * M, sh = 200;
    for (let i = 0; i < sw; i++) {
      const l = 280 + (i / sw) * 460;
      g.fillStyle = l < 380 ? `rgba(140,120,200,0.5)` : wavelengthCss(l);
      g.fillRect(sx + i, sy, 1, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    const X = (l: number) => sx + ((l - 280) / 460) * sw;
    const Y = (v: number) => sy + (1 - v) * sh;
    for (let i = 0; i < LAMBDAS.length; i++) {
      const lam = LAMBDAS[i];
      const active = (i + 1) === this.hi;
      g.strokeStyle = active ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = active ? 2.5 : 1;
      g.beginPath();
      for (let l = 280; l <= 740; l += 2) {
        const a = Math.exp(-Math.pow((l - lam) / 16, 2));
        const X0 = X(l), Y0 = Y(a);
        if (l === 280) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
      }
      g.stroke();
      g.fillStyle = active ? theme.crimson : theme.inkAlpha(0.65);
      g.font = active ? '10px serif' : '9px serif'; g.textAlign = 'center';
      g.fillText(`${i + 1}`, X(lam), sy - 4);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Thoen et al. 2014 showed mantis shrimp discriminate colours WORSE than humans — 12 channels feed a fast template match, not a perceptual hyperspectral code.', M, h - M);
  }
}

new MantisShrimp();
