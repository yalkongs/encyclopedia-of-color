import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Hydrangea {
  private stage: CanvasStage;
  private pH = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pH = hydrateNumber('pH', 60);
    const s = document.getElementById('pH') as EncSlider; s.value = this.pH;
    s.addEventListener('input', (e) => { this.pH = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pH', () => Math.round(this.pH));
    document.addEventListener('reset-params', () => { this.pH = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const pH = this.pH / 10;
    // Sigmoid around pH 5.5
    const blueFrac = 1 / (1 + Math.exp((pH - 5.5) * 1.8));
    const r = Math.round(230 - 130 * blueFrac);
    const gn = Math.round(120 - 50 * blueFrac);
    const b = Math.round(150 + 70 * blueFrac);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`soil pH = ${pH.toFixed(1)} · blue fraction = ${blueFrac.toFixed(2)}`, M, M);

    // Flower cluster
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 25; i++) {
      const dx = (i % 5 - 2) * 60;
      const dy = (Math.floor(i / 5) - 2) * 60;
      g.fillStyle = `rgb(${r},${gn},${b})`;
      g.beginPath(); g.arc(cx + dx, cy + dy, 22, 0, Math.PI * 2); g.fill();
      g.strokeStyle = theme.inkAlpha(0.4); g.stroke();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Hydrangea macrophylla famously colour-shifts with soil — same plant, different chemistry. Gardeners can flip the colour each season by amendment.', M, h - M);
  }
}

new Hydrangea();
