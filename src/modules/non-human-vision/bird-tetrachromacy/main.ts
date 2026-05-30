import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class BirdTet {
  private stage: CanvasStage;
  private view: 'human' | 'bird-UV' = 'bird-UV';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('view');
    if (raw === 'human' || raw === 'bird-UV') this.view = raw;
    const t = document.getElementById('view') as EncToggle; t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value as 'human' | 'bird-UV'; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.view = 'bird-UV'; t.value = 'bird-UV'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`view: ${this.view} — blue tit (Cyanistes caeruleus) example`, M, M);

    // Stylised blue tit head with crown
    const cx = w / 2, cy = h / 2 - 20, R = 110;
    // Body
    g.fillStyle = '#a8c4d8';
    g.beginPath(); g.arc(cx, cy + 30, R * 0.9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // Crown — yellow with UV bloom in bird view
    if (this.view === 'bird-UV') {
      const grad = g.createRadialGradient(cx, cy - 40, 0, cx, cy - 40, 90);
      grad.addColorStop(0, 'rgba(180,180,255,0.9)');
      grad.addColorStop(1, 'rgba(180,180,255,0)');
      g.fillStyle = grad; g.fillRect(cx - 90, cy - 130, 180, 100);
    }
    g.fillStyle = this.view === 'bird-UV' ? '#e8e8ff' : '#d4b020';
    g.beginPath(); g.arc(cx, cy - 50, 50, Math.PI, 2 * Math.PI); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // Eye
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(cx - 30, cy + 10, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 28, cy + 8, 2, 0, Math.PI * 2); g.fill();
    // Beak
    g.fillStyle = '#3a3a40'; g.beginPath();
    g.moveTo(cx - 60, cy + 20); g.lineTo(cx - 90, cy + 30); g.lineTo(cx - 60, cy + 40); g.closePath(); g.fill();

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(this.view === 'bird-UV' ? 'crown reflects strong UV — invisible to us' : 'crown looks just yellow to humans', cx, cy + R * 0.9 + 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Female blue tits prefer males with more UV-reflective crowns. Birds see colour dimensions we literally cannot.', M, h - M);
  }
}

new BirdTet();
