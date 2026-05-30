import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class Catshark {
  private stage: CanvasStage;
  private light: 'surface-white' | 'blue-200m' = 'blue-200m';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('light');
    if (raw === 'surface-white' || raw === 'blue-200m') this.light = raw;
    const t = document.getElementById('light') as EncToggle; t.value = this.light;
    t.addEventListener('change', (e) => { this.light = (e as CustomEvent).detail.value as 'surface-white' | 'blue-200m'; this.draw(); notifyStateChange(); });
    registerStateParam('light', () => this.light);
    document.addEventListener('reset-params', () => { this.light = 'blue-200m'; t.value = 'blue-200m'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    const blue = this.light === 'blue-200m';
    g.fillStyle = blue ? '#001528' : '#3a5a78'; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = blue ? '#dcd6c4' : '#1a1a1a'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`chain catshark under ${this.light}`, M, M);

    // Shark silhouette
    const cx = w / 2, cy = h / 2;
    g.fillStyle = blue ? '#0a1525' : '#5a7088';
    g.beginPath();
    g.moveTo(cx - 250, cy); g.bezierCurveTo(cx - 150, cy - 60, cx + 100, cy - 50, cx + 200, cy);
    g.bezierCurveTo(cx + 220, cy + 10, cx + 230, cy + 30, cx + 220, cy + 40);
    g.bezierCurveTo(cx + 100, cy + 60, cx - 150, cy + 70, cx - 250, cy + 20);
    g.closePath(); g.fill();
    // Tail
    g.beginPath(); g.moveTo(cx + 200, cy - 20); g.lineTo(cx + 260, cy - 60); g.lineTo(cx + 250, cy + 50); g.lineTo(cx + 220, cy + 20); g.closePath(); g.fill();
    // Fluorescent skin pattern
    if (blue) {
      g.fillStyle = 'rgba(80,255,150,0.8)';
      for (let i = 0; i < 20; i++) {
        const x = cx - 200 + Math.random() * 380;
        const y = cy - 30 + Math.random() * 60;
        g.beginPath(); g.arc(x, y, 4 + Math.random() * 3, 0, Math.PI * 2); g.fill();
      }
    }

    g.fillStyle = blue ? 'rgba(220,210,180,0.65)' : 'rgba(0,0,0,0.65)'; g.font = '11px serif';
    g.fillText('Below 200 m everything in the ocean is blue. The catshark\'s fluorescent green is visible only to other catsharks — a private signalling channel.', M, h - M);
  }
}

new Catshark();
