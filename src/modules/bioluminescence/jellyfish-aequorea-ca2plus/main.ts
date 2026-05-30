import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class Aequorea {
  private stage: CanvasStage;
  private Ca = 50;
  private gfp: 'on' | 'off' = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.Ca = hydrateNumber('Ca', 50);
    const raw = hydrateFromUrl('gfp');
    if (raw === 'on' || raw === 'off') this.gfp = raw;
    const sC = document.getElementById('Ca') as EncSlider; sC.value = this.Ca;
    sC.addEventListener('input', (e) => { this.Ca = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tG = document.getElementById('gfp') as EncToggle; tG.value = this.gfp;
    tG.addEventListener('change', (e) => { this.gfp = (e as CustomEvent).detail.value as 'on' | 'off'; this.draw(); notifyStateChange(); });
    registerStateParam('Ca', () => Math.round(this.Ca));
    registerStateParam('gfp', () => this.gfp);
    document.addEventListener('reset-params', () => { this.Ca = 50; this.gfp = 'on'; sC.value = 50; tG.value = 'on'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#001025'; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.Ca > 20 ? Math.min(1, (this.Ca - 20) / 30) : 0;
    const lam = this.gfp === 'on' ? 509 : 470;
    const colour = wavelengthCss(lam);

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`[Ca²⁺] index = ${this.Ca} · GFP coupling = ${this.gfp} · emission ${lam} nm`, M, M);

    // Jellyfish bell
    const cx = w / 2, cy = M + 200, R = 130;
    g.fillStyle = `rgba(180,200,210,${0.2 + 0.2 * I})`;
    g.beginPath(); g.arc(cx, cy, R, Math.PI, 2 * Math.PI); g.fill();
    g.strokeStyle = 'rgba(220,230,240,0.4)'; g.stroke();
    // Glow ring
    if (I > 0.05) {
      const grad = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5);
      grad.addColorStop(0, `${colour.replace('rgb', 'rgba').replace(')', `,${I * 0.9})`)}`);
      grad.addColorStop(1, `${colour.replace('rgb', 'rgba').replace(')', ',0)')}`);
      g.fillStyle = grad; g.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 1.5);
    }
    // Tentacles
    g.strokeStyle = `rgba(180,200,220,0.5)`; g.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const x = cx - R + (i / 12) * R * 2;
      g.beginPath(); g.moveTo(x, cy);
      g.bezierCurveTo(x - 4, cy + 60, x + 8, cy + 100, x, cy + 140);
      g.stroke();
    }

    g.fillStyle = 'rgba(220,210,180,0.6)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Shimomura discovered aequorin in 1962 and GFP shortly after — both molecules now power calcium imaging and fluorescence microscopy worldwide.', M, h - M);
  }
}

new Aequorea();
