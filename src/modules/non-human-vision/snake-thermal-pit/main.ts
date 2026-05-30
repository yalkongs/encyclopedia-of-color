import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SnakeIR {
  private stage: CanvasStage;
  private dT = 120;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dT = hydrateNumber('dT', 120);
    const s = document.getElementById('dT') as EncSlider; s.value = this.dT;
    s.addEventListener('input', (e) => { this.dT = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dT', () => Math.round(this.dT));
    document.addEventListener('reset-params', () => { this.dT = 120; s.value = 120; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#000810'; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = Math.min(1, this.dT / 200);

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`prey ΔT = ${(this.dT / 10).toFixed(1)} K · thermal contrast = ${I.toFixed(2)}`, M, M);

    // Thermal image of warm mouse on cool background
    const cx = w / 2, cy = h / 2, R = 80;
    // Background gradient (cool)
    g.fillStyle = '#202830'; g.fillRect(M, M + 30, w - 2 * M, h - M * 2 - 60);
    // Warm prey
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R * 2);
    grad.addColorStop(0, `rgba(255,${Math.round(220 - I * 100)},80,${I})`);
    grad.addColorStop(0.5, `rgba(220,80,40,${I * 0.5})`);
    grad.addColorStop(1, 'rgba(60,40,30,0)');
    g.fillStyle = grad; g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    g.fillStyle = `rgba(255,${Math.round(180 - I * 100)},100,${0.7 + I * 0.3})`;
    g.beginPath(); g.ellipse(cx, cy, R, R * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(40,40,50,${1 - I * 0.5})`; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('mouse (warm body)', cx, cy + R + 20);

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Thermal sensitivity: ~5 mK detection threshold — far below human IR sensors. Snake can ambush prey in total darkness.', M, h - M);
  }
}

new SnakeIR();
