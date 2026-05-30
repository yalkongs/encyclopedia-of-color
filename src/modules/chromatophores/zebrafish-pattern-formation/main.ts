import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Zebrafish {
  private stage: CanvasStage;
  private lam = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lam = hydrateNumber('lam', 40);
    const s = document.getElementById('lam') as EncSlider; s.value = this.lam;
    s.addEventListener('input', (e) => { this.lam = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lam', () => Math.round(this.lam));
    document.addEventListener('reset-params', () => { this.lam = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = '#dcd6c4'; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`stripe wavelength = ${this.lam} px (Turing pattern)`, M, M);

    // Fish body
    const cx = w / 2, cy = h / 2, R = 200;
    g.save();
    g.beginPath();
    g.moveTo(cx - R, cy);
    g.bezierCurveTo(cx - 150, cy - 70, cx + 150, cy - 70, cx + R, cy);
    g.bezierCurveTo(cx + 150, cy + 70, cx - 150, cy + 70, cx - R, cy);
    g.clip();
    // Background yellow (xanthophore)
    g.fillStyle = '#e0c050'; g.fillRect(cx - R - 10, cy - 80, R * 2 + 20, 160);
    // Black stripes (melanophore)
    g.fillStyle = '#1a1a1a';
    for (let x = cx - R; x < cx + R; x += this.lam) {
      g.fillRect(x, cy - 80, this.lam * 0.4, 160);
    }
    g.restore();
    g.strokeStyle = theme.inkAlpha(0.5);
    g.beginPath();
    g.moveTo(cx - R, cy);
    g.bezierCurveTo(cx - 150, cy - 70, cx + 150, cy - 70, cx + R, cy);
    g.bezierCurveTo(cx + 150, cy + 70, cx - 150, cy + 70, cx - R, cy);
    g.stroke();
    // Tail
    g.fillStyle = '#e0c050'; g.beginPath();
    g.moveTo(cx + R, cy - 40); g.lineTo(cx + R + 60, cy - 50); g.lineTo(cx + R + 60, cy + 50); g.lineTo(cx + R, cy + 40); g.closePath(); g.fill();
    g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('A literal Turing system in vivo. Laser-ablate a stripe of melanophores and the fish regenerates them at the same wavelength.', M, h - M);
  }
}

new Zebrafish();
