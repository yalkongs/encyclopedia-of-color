import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class BeeUV {
  private stage: CanvasStage;
  private view: 'human' | 'bee-UV' = 'bee-UV';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('view');
    if (raw === 'human' || raw === 'bee-UV') this.view = raw;
    const t = document.getElementById('view') as EncToggle; t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value as 'human' | 'bee-UV'; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.view = 'bee-UV'; t.value = 'bee-UV'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`dandelion · ${this.view}`, M, M);

    const cx = w / 2, cy = h / 2;
    // Petals
    const petalCol = this.view === 'human' ? '#f2c020' : '#b0b0c0';
    g.fillStyle = petalCol;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, 50, 18, a, 0, Math.PI * 2);
      g.fill();
    }
    // Centre — bullseye in bee view
    const centreCol = this.view === 'human' ? '#f2c020' : '#3a2050';
    g.fillStyle = centreCol;
    g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.4); g.stroke();

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(this.view === 'human' ? 'uniformly yellow' : 'central UV bullseye — landing target', cx, cy + 120);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Mimulus, evening primrose, dandelion, sunflower — most yellow flowers carry an invisible-to-us UV nectar guide.', M, h - M);
  }
}

new BeeUV();
