import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Betacyanin {
  private stage: CanvasStage;
  private c = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 50);
    const s = document.getElementById('c') as EncSlider; s.value = this.c;
    s.addEventListener('input', (e) => { this.c = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('c', () => Math.round(this.c));
    document.addEventListener('reset-params', () => { this.c = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.c / 100;
    const r = Math.round(160 * I + 240 * (1 - I));
    const gn = Math.round(20 * I + 220 * (1 - I));
    const b = Math.round(60 * I + 220 * (1 - I));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`beetroot juice · ${this.c}% concentration · λ_max 537 nm`, M, M);

    // Glass + juice
    const cx = w / 2, cy = h / 2;
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 80, cy - 100); g.lineTo(cx - 90, cy + 100); g.lineTo(cx + 90, cy + 100); g.lineTo(cx + 80, cy - 100); g.stroke();
    g.fillStyle = `rgb(${r},${gn},${b})`;
    g.beginPath(); g.moveTo(cx - 80 + 4, cy - 90); g.lineTo(cx - 88, cy + 95); g.lineTo(cx + 88, cy + 95); g.lineTo(cx + 80 - 4, cy - 90); g.closePath(); g.fill();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Betalains and anthocyanins are mutually exclusive in plants — no species makes both. Caryophyllales (beet, cactus) chose betalains.', M, h - M);
  }
}

new Betacyanin();
