import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class GFP {
  private stage: CanvasStage;
  private bar: 'on' | 'off' = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('bar');
    if (raw === 'on' || raw === 'off') this.bar = raw;
    const t = document.getElementById('bar') as EncToggle; t.value = this.bar;
    t.addEventListener('change', (e) => { this.bar = (e as CustomEvent).detail.value as 'on' | 'off'; this.draw(); notifyStateChange(); });
    registerStateParam('bar', () => this.bar);
    document.addEventListener('reset-params', () => { this.bar = 'on'; t.value = 'on'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#001508'; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.bar === 'on' ? 1 : 0.05;

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`p-HBDI chromophore · β-barrel ${this.bar} · fluorescence ${I.toFixed(2)}`, M, M);

    const cx = w / 2, cy = h / 2;
    // β-barrel as 11 vertical strands
    if (this.bar === 'on') {
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, 180);
      grad.addColorStop(0, `rgba(80,220,100,${0.9 * I})`);
      grad.addColorStop(1, 'rgba(80,220,100,0)');
      g.fillStyle = grad; g.fillRect(cx - 180, cy - 180, 360, 360);
      g.strokeStyle = 'rgba(220,210,180,0.7)'; g.lineWidth = 4;
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * 80;
        const y1 = cy + Math.sin(a) * 80 - 40;
        const y2 = y1 + 80;
        g.beginPath(); g.moveTo(x, y1); g.lineTo(x, y2); g.stroke();
      }
    }
    // Chromophore (centre)
    g.fillStyle = this.bar === 'on' ? '#80ff60' : '#403030';
    g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.stroke();

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('GFP can be fused as a genetic tag to any protein of interest — the lab-revolutionising technique recognised by the 2008 Nobel.', M, h - M);
  }
}

new GFP();
