import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

const D_BASE = 250; // sphere diameter nm
const N_OPAL = 1.45;

class Opal {
  private stage: CanvasStage;
  private ang = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ang = hydrateNumber('ang', 20);
    const s = document.getElementById('ang') as EncSlider; s.value = this.ang;
    s.addEventListener('input', (e) => { this.ang = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ang', () => Math.round(this.ang));
    document.addEventListener('reset-params', () => { this.ang = 20; s.value = 20; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const theta = (this.ang * Math.PI) / 180;
    // Bragg λ = 2 d_111 n cos(θ), d_111 = D * sqrt(2/3) for FCC
    const d111 = D_BASE * Math.sqrt(2 / 3);
    const lam = 2 * d111 * N_OPAL * Math.cos(theta);
    const colour = wavelengthCss(Math.max(380, Math.min(700, lam)));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`viewing angle = ${this.ang}° · Bragg λ = ${lam.toFixed(0)} nm`, M, M);

    // Opal stone with multiple coloured zones
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#fefcf6';
    g.beginPath(); g.ellipse(cx, cy, 200, 130, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // Flash patches
    for (let i = 0; i < 6; i++) {
      const cxF = cx + (Math.random() - 0.5) * 280;
      const cyF = cy + (Math.random() - 0.5) * 180;
      g.fillStyle = colour.replace('rgb', 'rgba').replace(')', ',0.7)');
      g.beginPath(); g.ellipse(cxF, cyF, 40 + Math.random() * 20, 25 + Math.random() * 15, Math.random() * Math.PI, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Opal "play of colour" is angular dispersion of one ordered FCC sphere lattice — a literal photonic crystal grown in cracks of sedimentary rock.', M, h - M);
  }
}

new Opal();
