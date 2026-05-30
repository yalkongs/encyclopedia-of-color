import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Ripening {
  private stage: CanvasStage;
  private day = 7;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.day = hydrateNumber('day', 7);
    const s = document.getElementById('day') as EncSlider; s.value = this.day;
    s.addEventListener('input', (e) => { this.day = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('day', () => Math.round(this.day));
    document.addEventListener('reset-params', () => { this.day = 7; s.value = 7; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const chl = Math.exp(-this.day / 4);
    const lyco = 1 / (1 + Math.exp(-(this.day - 6) / 1.5));

    // Tomato colour: chl green + lyco red
    const r = Math.round(60 * chl + 220 * lyco);
    const gn = Math.round(150 * chl + 50 * lyco);
    const b = Math.round(40 * chl + 40 * lyco);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`day ${this.day} · chl ${chl.toFixed(2)} · lycopene ${lyco.toFixed(2)}`, M, M);

    const cx = w / 2, cy = h / 2;
    g.fillStyle = `rgb(${r},${gn},${b})`;
    g.beginPath(); g.arc(cx, cy, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // stem
    g.fillStyle = '#3a5028';
    g.beginPath(); g.moveTo(cx, cy - 105); g.lineTo(cx - 18, cy - 130); g.lineTo(cx + 18, cy - 130); g.closePath(); g.fill();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Ethylene gas triggers the cascade. Storing ripe bananas next to green tomatoes ripens them — practical ethylene transfer.', M, h - M);
  }
}

new Ripening();
