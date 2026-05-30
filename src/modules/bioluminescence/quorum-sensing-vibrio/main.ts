import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function activation(d: number): number {
  // Hill-like switch around d=6 (10^6 cells/mL)
  return 1 / (1 + Math.pow(10, (6 - d) * 1.5));
}

class Quorum {
  private stage: CanvasStage;
  private d = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('den', 60);
    const s = document.getElementById('den') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('den', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#000812'; g.fillRect(0, 0, w, h);

    const M = 30;
    const dActual = this.d / 10;
    const I = activation(dActual);

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`density = 10^${dActual.toFixed(1)} cells/mL · activation = ${I.toFixed(2)}`, M, M);

    // Flask with bacteria
    const cx = w / 2, cy = M + 200, R = 140;
    g.strokeStyle = 'rgba(180,200,220,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    const n = Math.min(800, Math.round(50 * Math.pow(10, dActual / 3)));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (R - 10);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      g.fillStyle = `rgba(120,180,255,${0.25 + 0.7 * I})`;
      g.beginPath(); g.arc(x, y, 1.5, 0, Math.PI * 2); g.fill();
    }
    if (I > 0.05) {
      const grad = g.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.3);
      grad.addColorStop(0, `rgba(120,180,255,${0.4 * I})`);
      grad.addColorStop(1, 'rgba(120,180,255,0)');
      g.fillStyle = grad; g.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
    }

    // Activation curve
    const py = cy + R + 30, ph = 80;
    g.strokeStyle = 'rgba(180,180,180,0.5)'; g.strokeRect(M, py, w - 2 * M, ph);
    g.fillStyle = 'rgba(220,210,180,0.7)'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('activation vs log density (Hill switch)', M + (w - 2 * M) / 2, py - 6);
    g.strokeStyle = '#7cb0ff'; g.lineWidth = 2;
    g.beginPath();
    for (let dd = 0; dd <= 10; dd += 0.05) {
      const X = M + (dd / 10) * (w - 2 * M);
      const Y = py + (1 - activation(dd)) * ph;
      if (dd === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(M + (dActual / 10) * (w - 2 * M), py + (1 - I) * ph, 4, 0, Math.PI * 2); g.fill();

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Bassler\'s discovery: bacteria "talk" via chemical signals. Quorum-sensing antagonists are anti-virulence drug candidates.', M, h - M);
  }
}

new Quorum();
