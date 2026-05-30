import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Hummingbird {
  private stage: CanvasStage;
  private ang = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ang = hydrateNumber('ang', 0);
    const s = document.getElementById('ang') as EncSlider; s.value = this.ang;
    s.addEventListener('input', (e) => { this.ang = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ang', () => Math.round(this.ang));
    document.addEventListener('reset-params', () => { this.ang = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Gaussian angular response — narrow ±8° window
    const I = Math.exp(-Math.pow(this.ang / 8, 2));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`viewing angle = ${this.ang}° · gorget reflectance = ${I.toFixed(2)}`, M, M);

    // Bird silhouette with gorget that brightens
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#3a3a45';
    g.beginPath(); g.ellipse(cx, cy, 100, 70, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx - 70, cy - 30, 40, 0, Math.PI * 2); g.fill();
    // Beak
    g.fillStyle = '#3a3a40'; g.beginPath();
    g.moveTo(cx - 110, cy - 20); g.lineTo(cx - 170, cy - 15); g.lineTo(cx - 110, cy - 10); g.closePath(); g.fill();
    // Gorget
    const gorgetR = 60, gorgetG = 30, gorgetB = 90;
    const intensity = I;
    g.fillStyle = `rgb(${Math.round(60 + gorgetR * 3 * intensity)},${Math.round(60 + gorgetG * 0.5 * intensity)},${Math.round(80 + gorgetB * 2 * intensity)})`;
    g.beginPath(); g.ellipse(cx - 75, cy - 5, 26, 30, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Unlike Morpho\'s broad-angle iridescence, hummingbird gorget is specular — narrow band, narrow angle. Combined with display posing, makes a courtship signal flash.', M, h - M);
  }
}

new Hummingbird();
