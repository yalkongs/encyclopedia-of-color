import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Flavonoid {
  private stage: CanvasStage;
  private lat = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lat = hydrateNumber('lat', 40);
    const s = document.getElementById('lat') as EncSlider; s.value = this.lat;
    s.addEventListener('input', (e) => { this.lat = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lat', () => Math.round(this.lat));
    document.addEventListener('reset-params', () => { this.lat = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const uvB = Math.cos(this.lat * Math.PI / 180) * 1.2;
    const flav = uvB;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`latitude = ${this.lat}° · UV-B = ${uvB.toFixed(2)} · flavonoid index = ${flav.toFixed(2)}`, M, M);

    // Leaf cross-section
    const lx = M + 40, ly = M + 60, lw = 400, lh = 200;
    // Epidermis with flavonoid (darker top)
    g.fillStyle = `rgba(200,220,160,${0.5 + flav * 0.5})`;
    g.fillRect(lx, ly, lw, 35);
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('epidermis (flavonoid layer)', lx + 4, ly + 22);
    // Mesophyll
    g.fillStyle = '#7ca860';
    g.fillRect(lx, ly + 35, lw, lh - 50);
    g.fillStyle = '#fff';
    g.fillText('photosynthetic mesophyll', lx + 4, ly + 140);

    // UV arrows
    g.strokeStyle = '#8060d0'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const x = lx + 50 + i * 80;
      g.beginPath(); g.moveTo(x, ly - 30); g.lineTo(x, ly + 30);
      g.lineTo(x - 3, ly + 26); g.moveTo(x, ly + 30); g.lineTo(x + 3, ly + 26); g.stroke();
    }
    // Block fraction
    g.fillStyle = `rgba(140,100,200,${0.4 + flav * 0.5})`;
    g.fillRect(lx, ly + 28, lw, 10);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('High-altitude rhododendrons, tropical canopy leaves, and grain pericarps invest 5-10× more flavonoid than shade-adapted plants — measurable by UV-fluorescence imaging.', M, h - M);
  }
}

new Flavonoid();
