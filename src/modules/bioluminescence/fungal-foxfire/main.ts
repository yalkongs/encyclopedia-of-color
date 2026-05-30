import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type Sp = 'mycena' | 'neonothopanus' | 'armillaria';
const SPS: Sp[] = ['mycena', 'neonothopanus', 'armillaria'];
const BRIGHT: Record<Sp, number> = { mycena: 0.85, neonothopanus: 0.95, armillaria: 0.45 };

class Foxfire {
  private stage: CanvasStage;
  private t = 60;
  private sp: Sp = 'mycena';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 60);
    const raw = hydrateFromUrl('sp');
    if (raw && (SPS as string[]).includes(raw)) this.sp = raw as Sp;
    const sT = document.getElementById('t') as EncSlider; sT.value = this.t;
    sT.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tS = document.getElementById('sp') as EncToggle; tS.value = this.sp;
    tS.addEventListener('change', (e) => { this.sp = (e as CustomEvent).detail.value as Sp; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    registerStateParam('sp', () => this.sp);
    document.addEventListener('reset-params', () => { this.t = 60; this.sp = 'mycena'; sT.value = 60; tS.value = 'mycena'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#000505'; g.fillRect(0, 0, w, h);

    const M = 30;
    // Steady through night with slight peak at midnight (~hour 6)
    const tH = this.t / 10;
    const I = BRIGHT[this.sp] * (0.6 + 0.4 * Math.exp(-Math.pow((tH - 6) / 4, 2)));

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.sp} · hour ${tH.toFixed(1)} of night · brightness = ${I.toFixed(2)}`, M, M);

    // 6 mushrooms scattered
    for (let i = 0; i < 6; i++) {
      const cx = M + 80 + i * 120, cy = h / 2 + 40;
      // Stem
      g.fillStyle = '#3a2a25'; g.fillRect(cx - 6, cy - 60, 12, 60);
      // Cap with glow
      const grad = g.createRadialGradient(cx, cy - 50, 0, cx, cy - 50, 80);
      grad.addColorStop(0, `rgba(120,255,150,${0.85 * I})`);
      grad.addColorStop(1, 'rgba(120,255,150,0)');
      g.fillStyle = grad; g.fillRect(cx - 80, cy - 130, 160, 160);
      g.fillStyle = `rgb(${Math.round(60 + 100 * I)},${Math.round(120 + 130 * I)},${Math.round(80 + 80 * I)})`;
      g.beginPath(); g.ellipse(cx, cy - 50, 28, 14, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke();
    }

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Foxfire was named by Civil War soldiers who used glowing fungal logs as map lights. The luciferin was finally identified by Kotlobay 2017.', M, h - M);
  }
}

new Foxfire();
