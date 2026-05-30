import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class Reef {
  private stage: CanvasStage;
  private light: 'white' | 'UV-blue' = 'UV-blue';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('light');
    if (raw === 'white' || raw === 'UV-blue') this.light = raw;
    const t = document.getElementById('light') as EncToggle; t.value = this.light;
    t.addEventListener('change', (e) => { this.light = (e as CustomEvent).detail.value as 'white' | 'UV-blue'; this.draw(); notifyStateChange(); });
    registerStateParam('light', () => this.light);
    document.addEventListener('reset-params', () => { this.light = 'UV-blue'; t.value = 'UV-blue'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    const isUV = this.light === 'UV-blue';
    g.fillStyle = isUV ? '#001230' : '#3a6080'; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = isUV ? '#dcd6c4' : '#1a1a1a'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`coral reef under ${this.light} light`, M, M);

    // Coral patches scattered
    const colours = isUV ? ['#40ff80', '#ff6020', '#ff20a0', '#80ffff'] : ['#a08060', '#604030', '#705040', '#806050'];
    for (let i = 0; i < 30; i++) {
      const x = M + Math.random() * (w - 2 * M);
      const y = M + 30 + Math.random() * (h - 100);
      const r = 20 + Math.random() * 30;
      const col = colours[i % 4];
      if (isUV) {
        const grad = g.createRadialGradient(x, y, 0, x, y, r * 1.5);
        grad.addColorStop(0, col); grad.addColorStop(1, col + '00');
        g.fillStyle = grad;
        g.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
      }
      g.fillStyle = col;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = isUV ? 'rgba(220,210,180,0.65)' : 'rgba(0,0,0,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Tropical-reef night dives with blue lamps expose the secret world of GFP/RFP-expressing corals.', M, h - M);
  }
}

new Reef();
