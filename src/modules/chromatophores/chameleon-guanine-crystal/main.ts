import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class Chameleon {
  private stage: CanvasStage;
  private a = 180;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.a = hydrateNumber('a', 180);
    const s = document.getElementById('a') as EncSlider; s.value = this.a;
    s.addEventListener('input', (e) => { this.a = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('a', () => Math.round(this.a));
    document.addEventListener('reset-params', () => { this.a = 180; s.value = 180; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lam = 2 * 1.55 * this.a;
    const colour = wavelengthCss(Math.max(380, Math.min(700, lam)));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`guanine lattice a = ${this.a} nm · reflection λ = ${lam.toFixed(0)} nm`, M, M);

    // Chameleon silhouette
    const cx = w / 2, cy = h / 2;
    g.fillStyle = colour;
    g.beginPath();
    g.moveTo(cx - 200, cy);
    g.bezierCurveTo(cx - 150, cy - 80, cx + 100, cy - 60, cx + 200, cy - 20);
    g.bezierCurveTo(cx + 230, cy, cx + 220, cy + 40, cx + 180, cy + 60);
    g.bezierCurveTo(cx + 50, cy + 80, cx - 150, cy + 60, cx - 200, cy);
    g.fill();
    // tail spiral
    g.strokeStyle = colour; g.lineWidth = 20;
    g.beginPath();
    g.moveTo(cx + 200, cy); g.bezierCurveTo(cx + 280, cy - 20, cx + 300, cy + 60, cx + 260, cy + 90);
    g.stroke();
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1; g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('A chameleon doesn\'t pump pigment — it stretches its guanine lattice. Confirmed in cryo-EM by Teyssier 2015.', M, h - M);
  }
}

new Chameleon();
