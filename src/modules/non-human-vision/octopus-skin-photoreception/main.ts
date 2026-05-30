import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Amb = 'sandy' | 'reef' | 'sea-grass';
const AMBS: Amb[] = ['sandy', 'reef', 'sea-grass'];
const INFO: Record<Amb, { bg: [number, number, number]; skin: [number, number, number] }> = {
  sandy:    { bg: [220, 200, 140], skin: [210, 180, 120] },
  reef:     { bg: [180, 100, 90],  skin: [190, 90, 70] },
  'sea-grass':{ bg: [80, 130, 60], skin: [90, 120, 55] },
};

class OctSkin {
  private stage: CanvasStage;
  private amb: Amb = 'reef';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('amb');
    if (raw && (AMBS as string[]).includes(raw)) this.amb = raw as Amb;
    const t = document.getElementById('amb') as EncToggle; t.value = this.amb;
    t.addEventListener('change', (e) => { this.amb = (e as CustomEvent).detail.value as Amb; this.draw(); notifyStateChange(); });
    registerStateParam('amb', () => this.amb);
    document.addEventListener('reset-params', () => { this.amb = 'reef'; t.value = 'reef'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    const i = INFO[this.amb];

    g.fillStyle = `rgb(${i.bg[0]},${i.bg[1]},${i.bg[2]})`; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = '#1a1a1a'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`ambient: ${this.amb} — octopus skin samples local spectrum`, M, M);

    // Octopus silhouette with chromatophore pattern matching ambient
    const cx = w / 2, cy = h / 2 + 20;
    g.fillStyle = `rgb(${i.skin[0]},${i.skin[1]},${i.skin[2]})`;
    g.beginPath(); g.ellipse(cx, cy - 30, 90, 70, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke();
    // Tentacles
    g.strokeStyle = `rgba(${i.skin[0] - 40},${i.skin[1] - 40},${i.skin[2] - 40},0.9)`; g.lineWidth = 14;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 40);
      g.bezierCurveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 90, cx + Math.cos(a) * 140, cy + Math.sin(a) * 130, cx + Math.cos(a) * 160, cy + Math.sin(a) * 160);
      g.stroke();
    }
    // Pattern dots (chromatophores)
    for (let k = 0; k < 80; k++) {
      const x = cx - 80 + Math.random() * 160;
      const y = cy - 80 + Math.random() * 120;
      g.fillStyle = `rgba(${i.skin[0] - 30 + Math.random() * 60},${i.skin[1] - 30 + Math.random() * 60},${i.skin[2] - 30 + Math.random() * 60},0.8)`;
      g.beginPath(); g.arc(x, y, 3 + Math.random() * 2, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = '#1a1a1a'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Octopus retina is monochromat — yet camouflage matches ambient colour. Distributed skin photoreception is one leading hypothesis.', M, h - M);
  }
}

new OctSkin();
