import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class MemColour {
  private stage: CanvasStage;
  private g0 = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.g0 = hydrateNumber('g', 60);
    const s = document.getElementById('g') as EncSlider; s.value = this.g0;
    s.addEventListener('input', (e) => { this.g0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('g', () => Math.round(this.g0));
    document.addEventListener('reset-params', () => { this.g0 = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lum = Math.round(this.g0 * 2.55);
    const actualHex = `rgb(${lum},${lum},${lum})`;
    // Memory shift: banana = yellow (+R+G−B); strawberry = red; sky = blue
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`actual grey ${this.g0} → ${actualHex}; remembered shifts toward each object's typical colour`, M, M);

    const objects = [
      { name: 'banana', shift: [10, 10, -20], shape: 'banana' },
      { name: 'strawberry', shift: [25, -10, -5], shape: 'berry' },
      { name: 'sky patch', shift: [-15, -5, 25], shape: 'patch' },
      { name: 'tomato', shift: [25, -10, -10], shape: 'tomato' },
    ];
    const ox = M, oy = M + 40;
    const oW = (w - 2 * M) / 4, oH = h - 2 * M - 80;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const x = ox + i * oW;
      // Actual swatch top
      g.fillStyle = actualHex; g.fillRect(x + 20, oy, oW - 40, 60);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x + 20, oy, oW - 40, 60);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText('shown (actual)', x + oW / 2, oy + 78);
      // Remembered swatch
      const r2 = Math.max(0, Math.min(255, lum + obj.shift[0]));
      const g2 = Math.max(0, Math.min(255, lum + obj.shift[1]));
      const b2 = Math.max(0, Math.min(255, lum + obj.shift[2]));
      g.fillStyle = `rgb(${r2},${g2},${b2})`;
      g.fillRect(x + 20, oy + 100, oW - 40, 60);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x + 20, oy + 100, oW - 40, 60);
      g.fillStyle = theme.ink; g.fillText('remembered', x + oW / 2, oy + 178);
      // Label
      g.fillStyle = theme.ink; g.font = 'bold 13px serif';
      g.fillText(obj.name, x + oW / 2, oy + oH);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Top-down object knowledge (priors) modulates ambiguous colour percepts — basis of "memory colour" and "Hering opponent" priors.', M, h - M);
  }
}

new MemColour();
