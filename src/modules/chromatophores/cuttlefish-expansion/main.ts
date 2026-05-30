import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Cuttlefish {
  private stage: CanvasStage;
  private m = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.m = hydrateNumber('m', 60);
    const s = document.getElementById('m') as EncSlider; s.value = this.m;
    s.addEventListener('input', (e) => { this.m = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('m', () => Math.round(this.m));
    document.addEventListener('reset-params', () => { this.m = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#e0d5c8'; g.fillRect(0, 0, w, h);

    const M = 30;
    const exp = this.m / 100;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`muscle activation = ${this.m}% · chromatophores ${exp > 0.5 ? 'expanded' : 'contracted'}`, M, M);

    // Grid of chromatophores
    const sx = M, sy = M + 30, gap = 30;
    const rows = 12, cols = Math.floor((w - 2 * M) / gap);
    const r = 4 + exp * 14;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = sx + col * gap + (row % 2) * 15;
      const y = sy + row * gap;
      g.fillStyle = `rgba(${Math.round(80 - exp * 60)},${Math.round(40)},${Math.round(30)},${0.7 + exp * 0.3})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Cuttlefish change full-body pattern in <200 ms — fastest body colouration in the animal kingdom.', M, h - M);
  }
}

new Cuttlefish();
