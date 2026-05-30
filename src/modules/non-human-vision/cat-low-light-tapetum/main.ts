import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class CatTapetum {
  private stage: CanvasStage;
  private L = 2;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 2);
    const s = document.getElementById('L') as EncSlider; s.value = this.L;
    s.addEventListener('input', (e) => { this.L = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('L', () => Math.round(this.L));
    document.addEventListener('reset-params', () => { this.L = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#000508'; g.fillRect(0, 0, w, h);

    const M = 30;
    const L = this.L / 100;
    const human = L > 0.05 ? Math.min(1, L * 3) : L * 1.5;
    const cat = Math.min(1, L * 8);

    g.fillStyle = '#dcd6c4'; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`ambient light = ${this.L}% · human sees ${(human * 100).toFixed(0)}% · cat sees ${(cat * 100).toFixed(0)}%`, M, M);

    // Two scene panels
    const pW = (w - 3 * M) / 2, pH = 220;
    const py = M + 30;
    // Human view
    g.fillStyle = `rgba(255,255,255,${0.05 + human * 0.4})`; g.fillRect(M, py, pW, pH);
    g.fillStyle = `rgba(80,80,90,${0.2 + human * 0.5})`; g.fillRect(M + 50, py + 80, 80, 60); // chair
    g.fillStyle = `rgba(120,80,60,${0.2 + human * 0.5})`; g.fillRect(M + 200, py + 100, 60, 40); // table
    g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(M, py, pW, pH);
    g.fillStyle = '#dcd6c4'; g.font = '12px serif'; g.textAlign = 'center'; g.fillText('human view', M + pW / 2, py + pH + 16);

    // Cat view
    const cx = M * 2 + pW;
    g.fillStyle = `rgba(200,210,180,${0.1 + cat * 0.5})`; g.fillRect(cx, py, pW, pH);
    g.fillStyle = `rgba(120,140,110,${0.3 + cat * 0.5})`; g.fillRect(cx + 50, py + 80, 80, 60);
    g.fillStyle = `rgba(140,120,90,${0.3 + cat * 0.5})`; g.fillRect(cx + 200, py + 100, 60, 40);
    g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(cx, py, pW, pH);
    g.fillStyle = '#dcd6c4'; g.font = '12px serif'; g.textAlign = 'center'; g.fillText('cat view (tapetum boost)', cx + pW / 2, py + pH + 16);
    // Tapetum eye-glow indicator
    g.fillStyle = `rgba(220,220,80,${0.7})`; g.beginPath(); g.arc(cx + 30, py + 30, 6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 50, py + 30, 6, 0, Math.PI * 2); g.fill();

    g.fillStyle = 'rgba(220,210,180,0.65)'; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Tapetum lucidum doubles low-light sensitivity but slightly blurs the image — cat has acuity ~10× worse than human at high light.', M, h - M);
  }
}

new CatTapetum();
