import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class PhotoFP {
  private stage: CanvasStage;
  private state: 'dark' | 'bright' = 'bright';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('state');
    if (raw === 'dark' || raw === 'bright') this.state = raw;
    const t = document.getElementById('state') as EncToggle; t.value = this.state;
    t.addEventListener('change', (e) => { this.state = (e as CustomEvent).detail.value as 'dark' | 'bright'; this.draw(); notifyStateChange(); });
    registerStateParam('state', () => this.state);
    document.addEventListener('reset-params', () => { this.state = 'bright'; t.value = 'bright'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#000408'; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Dronpa state: ${this.state}`, M, M);

    const cx = w / 2, cy = h / 2;
    if (this.state === 'bright') {
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, 200);
      grad.addColorStop(0, 'rgba(80,255,120,0.9)'); grad.addColorStop(1, 'rgba(80,255,120,0)');
      g.fillStyle = grad; g.fillRect(cx - 200, cy - 200, 400, 400);
    }
    g.fillStyle = this.state === 'bright' ? '#80ff80' : '#303030';
    g.beginPath(); g.arc(cx, cy, 80, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.stroke();

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif';
    g.fillText('Single-molecule on/off switching is the basis of PALM super-resolution microscopy (Nobel 2014).', M, h - M);
  }
}

new PhotoFP();
