import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class Firefly {
  private stage: CanvasStage;
  private ATP = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ATP = hydrateNumber('ATP', 50);
    const s = document.getElementById('ATP') as EncSlider; s.value = this.ATP;
    s.addEventListener('input', (e) => { this.ATP = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ATP', () => Math.round(this.ATP));
    document.addEventListener('reset-params', () => { this.ATP = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#0a0a14'; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.ATP / 100;

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`ATP = ${this.ATP} µM · normalised flash intensity = ${I.toFixed(2)}`, M, M);

    // Firefly abdomen with glow
    const cx = w / 2, cy = M + 200, R = 80;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
    grad.addColorStop(0, `rgba(195,225,80,${0.95 * I})`);
    grad.addColorStop(0.5, `rgba(195,225,80,${0.3 * I})`);
    grad.addColorStop(1, 'rgba(195,225,80,0)');
    g.fillStyle = grad; g.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
    // Abdomen
    g.fillStyle = `rgb(${Math.round(140 + 90 * I)},${Math.round(140 + 80 * I)},${Math.round(50 + 30 * I)})`;
    g.beginPath(); g.ellipse(cx, cy, R, R * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke();

    // Linearity plot
    const px = M, py = cy + R + 40, pw = w - 2 * M, ph = 110;
    g.strokeStyle = 'rgba(180,180,180,0.5)'; g.strokeRect(px, py, pw, ph);
    g.fillStyle = 'rgba(220,210,180,0.7)'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('flash intensity vs [ATP] — linear', px + pw / 2, py - 6);
    g.strokeStyle = wavelengthCss(560); g.lineWidth = 2;
    g.beginPath();
    for (let A = 0; A <= 100; A += 2) {
      const X = px + (A / 100) * pw;
      const Y = py + (1 - A / 100) * ph;
      if (A === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(px + (this.ATP / 100) * pw, py + (1 - I) * ph, 5, 0, Math.PI * 2); g.fill();

    g.fillStyle = 'rgba(220,210,180,0.6)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Firefly luciferase + ATP assays detect 1 attomole ATP — the gold standard for ATP biosensors.', M, h - M);
  }
}

new Firefly();
