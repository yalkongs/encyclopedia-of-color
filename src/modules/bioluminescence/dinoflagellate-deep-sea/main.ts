import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const THRESHOLD = 25;

class Dinoflag {
  private stage: CanvasStage;
  private shear = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.shear = hydrateNumber('shear', 40);
    const s = document.getElementById('shear') as EncSlider; s.value = this.shear;
    s.addEventListener('input', (e) => { this.shear = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('shear', () => Math.round(this.shear));
    document.addEventListener('reset-params', () => { this.shear = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#001020'; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.shear > THRESHOLD ? Math.min(1, (this.shear - THRESHOLD) / 30) : 0;

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`shear = ${this.shear} mPa · threshold ${THRESHOLD} mPa · flash intensity = ${I.toFixed(2)}`, M, M);

    // Water with dinoflagellate dots — bright spots when I > 0
    for (let i = 0; i < 300; i++) {
      const x = M + Math.random() * (w - 2 * M);
      const y = M + 40 + Math.random() * 280;
      const r = 1 + Math.random() * 1;
      if (I > 0.05) {
        const grad = g.createRadialGradient(x, y, 0, x, y, 20);
        grad.addColorStop(0, `rgba(120,180,255,${I * 0.9})`);
        grad.addColorStop(1, 'rgba(120,180,255,0)');
        g.fillStyle = grad; g.fillRect(x - 20, y - 20, 40, 40);
      }
      g.fillStyle = `rgba(120,180,255,${0.2 + I * 0.8})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }

    // Time-trace
    const py = M + 360, ph = 90;
    g.strokeStyle = 'rgba(180,180,180,0.5)'; g.strokeRect(M, py, w - 2 * M, ph);
    g.fillStyle = 'rgba(220,210,180,0.7)'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('flash time-trace (peak ~100 ms, falls in 200 ms)', M + (w - 2 * M) / 2, py - 6);
    g.strokeStyle = `rgba(120,180,255,${0.5 + I * 0.4})`; g.lineWidth = 2;
    g.beginPath();
    for (let t = 0; t <= 1000; t += 10) {
      const X = M + (t / 1000) * (w - 2 * M);
      const Y = py + (1 - I * Math.exp(-Math.pow((t - 100) / 60, 2))) * ph;
      if (t === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('"Milky seas" historically reported by sailors — billions of dinoflagellates flashing in turbulence. Confirmed by satellite in 1995.', M, h - M);
  }
}

new Dinoflag();
