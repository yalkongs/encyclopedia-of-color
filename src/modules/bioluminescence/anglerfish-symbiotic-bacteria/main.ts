import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Anglerfish {
  private stage: CanvasStage;
  private O2 = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.O2 = hydrateNumber('O2', 80);
    const s = document.getElementById('O2') as EncSlider; s.value = this.O2;
    s.addEventListener('input', (e) => { this.O2 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('O2', () => Math.round(this.O2));
    document.addEventListener('reset-params', () => { this.O2 = 80; s.value = 80; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#000810'; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.O2 / 100;

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`O₂ supply = ${this.O2}% · lure brightness = ${(I * 100).toFixed(0)}%`, M, M);

    // Anglerfish silhouette
    const cx = w * 0.55, cy = h / 2 + 20;
    g.fillStyle = '#1a1a20';
    g.beginPath();
    g.moveTo(cx - 90, cy - 30); g.bezierCurveTo(cx - 60, cy - 60, cx + 50, cy - 50, cx + 80, cy - 20);
    g.lineTo(cx + 100, cy); g.lineTo(cx + 80, cy + 30);
    g.bezierCurveTo(cx + 60, cy + 50, cx - 50, cy + 60, cx - 80, cy + 30);
    g.closePath(); g.fill();
    // Teeth
    g.strokeStyle = '#dcd6c4'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(cx - 60 + i * 12, cy - 8); g.lineTo(cx - 60 + i * 12 + 3, cy + 4); g.stroke();
    }
    // Esca lure with bacteria glow
    const lx = cx - 40, ly = cy - 80;
    g.strokeStyle = '#1a1a20'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 50, cy - 30); g.bezierCurveTo(cx - 60, cy - 60, lx + 10, ly + 20, lx, ly); g.stroke();
    // Glow
    if (I > 0.05) {
      const grad = g.createRadialGradient(lx, ly, 0, lx, ly, 80);
      grad.addColorStop(0, `rgba(120,180,255,${0.9 * I})`);
      grad.addColorStop(0.5, `rgba(120,180,255,${0.4 * I})`);
      grad.addColorStop(1, 'rgba(120,180,255,0)');
      g.fillStyle = grad; g.fillRect(lx - 80, ly - 80, 160, 160);
    }
    g.fillStyle = `rgba(180,210,255,${0.5 + 0.5 * I})`;
    g.beginPath(); g.arc(lx, ly, 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(220,230,240,0.6)'; g.stroke();

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('First filmed only in 2014 (Edie Widder, Bertelsen). The fish-bacteria mutualism is the most famous symbiotic light system.', M, h - M);
  }
}

new Anglerfish();
