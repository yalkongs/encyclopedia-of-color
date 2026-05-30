import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Ep = 'wine-dark' | 'violet' | 'grey' | 'modern-blue';
const EPS: Ep[] = ['wine-dark', 'violet', 'grey', 'modern-blue'];
const INFO: Record<Ep, [number, number, number]> = {
  'wine-dark':   [110, 30, 60],
  'violet':      [130, 70, 150],
  'grey':        [110, 110, 120],
  'modern-blue': [40, 90, 180],
};

class Homer {
  private stage: CanvasStage;
  private ep: Ep = 'wine-dark';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('ep');
    if (raw && (EPS as string[]).includes(raw)) this.ep = raw as Ep;
    const t = document.getElementById('ep') as EncToggle; t.value = this.ep;
    t.addEventListener('change', (e) => { this.ep = (e as CustomEvent).detail.value as Ep; this.draw(); notifyStateChange(); });
    registerStateParam('ep', () => this.ep);
    document.addEventListener('reset-params', () => { this.ep = 'wine-dark'; t.value = 'wine-dark'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#fbd99a'; g.fillRect(0, 0, w, h * 0.4);
    const rgb = INFO[this.ep];
    g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    g.fillRect(0, h * 0.4, w, h * 0.6);

    const M = 30;
    g.fillStyle = '#1a1a1a'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Aegean sea as "${this.ep}"`, M, M);

    // Ship silhouette
    const cx = w * 0.7, cy = h * 0.5;
    g.fillStyle = '#3a2a1a';
    g.beginPath();
    g.moveTo(cx - 60, cy); g.lineTo(cx + 80, cy); g.lineTo(cx + 60, cy + 25); g.lineTo(cx - 40, cy + 25); g.closePath(); g.fill();
    // Mast + sail
    g.fillRect(cx + 10, cy - 80, 4, 80);
    g.fillStyle = '#e0d8b8';
    g.beginPath(); g.moveTo(cx + 14, cy - 80); g.lineTo(cx + 60, cy - 80); g.lineTo(cx + 60, cy); g.lineTo(cx + 14, cy); g.closePath(); g.fill();

    g.fillStyle = 'rgba(0,0,0,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Homer (~700 BCE) had no basic "blue" term. Gladstone 1858 thought ancient Greeks were colour-blind; in fact their language hadn\'t reached Berlin-Kay stage V.', M, h - M);
  }
}

new Homer();
