import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Melanin {
  private stage: CanvasStage;
  private ratio = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ratio = hydrateNumber('ratio', 60);
    const s = document.getElementById('ratio') as EncSlider; s.value = this.ratio;
    s.addEventListener('input', (e) => { this.ratio = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ratio', () => Math.round(this.ratio));
    document.addEventListener('reset-params', () => { this.ratio = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const eu = this.ratio / 100;
    const pheo = 1 - eu;

    // Hair colour: eumelanin → dark brown/black, pheomelanin → red
    const r = Math.round(50 * eu + 200 * pheo + 40);
    const gn = Math.round(30 * eu + 90 * pheo + 30);
    const b = Math.round(20 * eu + 50 * pheo + 20);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`eu = ${this.ratio}%  ·  pheo = ${100 - this.ratio}%`, M, M);

    // Hair swatch
    g.fillStyle = `rgb(${r},${gn},${b})`;
    g.fillRect(M + 30, M + 50, 280, 240);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 30, M + 50, 280, 240);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    const cat = eu > 0.85 ? 'black hair' : eu > 0.6 ? 'brown' : eu > 0.4 ? 'blonde' : 'red';
    g.fillText(`hair colour: ${cat}`, M + 30 + 140, M + 50 + 240 + 16);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('MC1R gene variants regulate the eu/pheo balance — red-hair "ginger" alleles produce mostly pheomelanin and provide weaker UV protection.', M, h - M);
  }
}

new Melanin();
