import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class Nacre {
  private stage: CanvasStage;
  private d = 500;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 500);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 500; s.value = 500; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lam = 0.7 * this.d; // approx broadband peak
    const colour = wavelengthCss(Math.max(380, Math.min(700, lam)));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`aragonite tablet d = ${this.d} nm · iridescence centred ${lam.toFixed(0)} nm`, M, M);

    // Brick wall on left
    const sx = M + 30, sy = M + 60, sw = 220, sh = 200;
    for (let r = 0; r < 10; r++) {
      const offset = (r % 2) * 30;
      for (let c = 0; c < 6; c++) {
        const x = sx + offset + c * 40;
        const y = sy + r * 20;
        g.fillStyle = '#e8e0d0';
        g.fillRect(x, y, 38, 18);
        g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.5; g.strokeRect(x, y, 38, 18);
      }
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('aragonite tablets', sx + sw / 2, sy + sh + 14);

    // Pearl
    const px = sx + sw + 80, py = M + 80;
    const grad = g.createRadialGradient(px + 40, py + 30, 0, px + 70, py + 80, 130);
    grad.addColorStop(0, '#fefdfa');
    grad.addColorStop(0.5, colour.replace('rgb', 'rgba').replace(')', ',0.6)'));
    grad.addColorStop(1, '#a0a0a0');
    g.fillStyle = grad;
    g.beginPath(); g.arc(px + 100, py + 100, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.4); g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same nano-architecture in abalone shells, pearls, and pearl jewellery — calcium carbonate dropped to nano-scale tablets.', M, h - M);
  }
}

new Nacre();
