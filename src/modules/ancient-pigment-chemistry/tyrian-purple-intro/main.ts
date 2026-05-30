import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Tyrian {
  private stage: CanvasStage;
  private n = 12;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 12);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 12; s.value = 12; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const grams = this.n / 12;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.n}k Murex snails harvested · ~${grams.toFixed(2)} g of dye produced`, M, M);

    // Cloth swatch
    const cx = w / 2 - 150, cy = M + 50;
    const intensity = Math.min(1, grams / 10);
    const r = Math.round(240 - intensity * 175);
    const gn = Math.round(230 - intensity * 200);
    const b = Math.round(220 - intensity * 130);
    g.fillStyle = `rgb(${r},${gn},${b})`;
    g.fillRect(cx, cy, 300, 220);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(cx, cy, 300, 220);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('dyed wool cloth', cx + 150, cy + 240);

    // Snail icons
    const sx = cx + 320, sy = cy;
    for (let i = 0; i < Math.min(50, this.n); i++) {
      const x = sx + (i % 10) * 14;
      const y = sy + Math.floor(i / 10) * 14;
      g.fillStyle = '#8a6a40';
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Pliny: "the colour of clotted blood, sublimely dark". A pound of dyed wool cost more than gold. Roman emperors reserved it by law.', M, h - M);
  }
}

new Tyrian();
