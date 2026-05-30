import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class IrideBegonia {
  private stage: CanvasStage;
  private ir: 'on' | 'off' = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('ir');
    if (raw === 'on' || raw === 'off') this.ir = raw;
    const t = document.getElementById('ir') as EncToggle; t.value = this.ir;
    t.addEventListener('change', (e) => { this.ir = (e as CustomEvent).detail.value as 'on' | 'off'; this.draw(); notifyStateChange(); });
    registerStateParam('ir', () => this.ir);
    document.addEventListener('reset-params', () => { this.ir = 'on'; t.value = 'on'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Begonia pavonina leaf · iridoplast ${this.ir}`, M, M);

    // Leaf
    const cx = w / 2, cy = h / 2;
    g.fillStyle = this.ir === 'on' ? '#3a5078' : '#4a7048';
    g.beginPath();
    g.moveTo(cx, cy - 130);
    g.bezierCurveTo(cx + 180, cy - 100, cx + 180, cy + 100, cx, cy + 130);
    g.bezierCurveTo(cx - 180, cy + 100, cx - 180, cy - 100, cx, cy - 130);
    g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // Add blue iridescent spots if on
    if (this.ir === 'on') {
      for (let i = 0; i < 8; i++) {
        const x = cx + (Math.random() - 0.5) * 280;
        const y = cy + (Math.random() - 0.5) * 200;
        const grad = g.createRadialGradient(x, y, 0, x, y, 30);
        grad.addColorStop(0, 'rgba(140,180,255,0.8)');
        grad.addColorStop(1, 'rgba(140,180,255,0)');
        g.fillStyle = grad; g.fillRect(x - 30, y - 30, 60, 60);
      }
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Iridoplasts in deep-shade tropical begonias: a photonic crystal that *enhances* photosynthesis efficiency for what little light penetrates.', M, h - M);
  }
}

new IrideBegonia();
