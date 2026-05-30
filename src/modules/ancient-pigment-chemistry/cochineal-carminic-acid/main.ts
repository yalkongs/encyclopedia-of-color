import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Cochineal {
  private stage: CanvasStage;
  private pH = 5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pH = hydrateNumber('pH', 5);
    const s = document.getElementById('pH') as EncSlider; s.value = this.pH;
    s.addEventListener('input', (e) => { this.pH = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pH', () => this.pH.toFixed(1));
    document.addEventListener('reset-params', () => { this.pH = 5; s.value = 5; this.draw(); notifyStateChange(); });
  }

  private colorAt(pH: number): string {
    if (pH < 4.5) return '#e07020';
    if (pH < 5.5) return '#c8203a';
    if (pH < 7) return '#a8175f';
    if (pH < 8.5) return '#7a1080';
    return '#481995';
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.colorAt(this.pH);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pH = ${this.pH.toFixed(1)} · carminic acid colour = ${col}`, M, M);

    // pH strip (continuous gradient)
    const bx = M, by = M + 30, bw = w - 2 * M, bh = 24;
    const grad = g.createLinearGradient(bx, by, bx + bw, by);
    grad.addColorStop(0, '#e07020');
    grad.addColorStop(0.25, '#c8203a');
    grad.addColorStop(0.5, '#a8175f');
    grad.addColorStop(0.75, '#7a1080');
    grad.addColorStop(1, '#481995');
    g.fillStyle = grad; g.fillRect(bx, by, bw, bh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, bw, bh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('pH 3 (acid)', bx, by + bh + 14);
    g.textAlign = 'right'; g.fillText('pH 10 (alkaline)', bx + bw, by + bh + 14);

    // Marker on strip
    const mx = bx + ((this.pH - 3) / 7) * bw;
    g.strokeStyle = theme.ink; g.lineWidth = 2;
    g.beginPath(); g.moveTo(mx, by - 4); g.lineTo(mx, by + bh + 4); g.stroke();

    // Dye vat (left)
    const vx = M, vy = by + 80, vr = 70;
    g.fillStyle = col;
    g.beginPath(); g.ellipse(vx + vr, vy + vr, vr, vr * 0.4, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(vx, vy + vr); g.lineTo(vx, vy + vr * 1.8);
    g.bezierCurveTo(vx, vy + vr * 2.2, vx + 2 * vr, vy + vr * 2.2, vx + 2 * vr, vy + vr * 1.8);
    g.lineTo(vx + 2 * vr, vy + vr); g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('dye bath', vx + vr, vy + vr * 2 + 20);

    // Insect grid (right)
    const ix = vx + 2 * vr + 40, iy = vy;
    const cols = 14, rows = 6;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const cx = ix + j * 24, cy = iy + i * 24;
      // body
      g.fillStyle = '#5a1818';
      g.beginPath(); g.ellipse(cx, cy, 9, 6, 0, 0, Math.PI * 2); g.fill();
      // segments
      g.strokeStyle = '#2a0808'; g.lineWidth = 0.5;
      for (let k = -2; k <= 2; k++) {
        g.beginPath(); g.moveTo(cx + k * 3, cy - 5); g.lineTo(cx + k * 3, cy + 5); g.stroke();
      }
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`${rows * cols} Dactylopius coccus (× ~830 to make 1 lb of dye)`, ix + cols * 12, iy + rows * 24 + 20);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Carminic acid is still used today in cosmetics, food (E120), and natural-dye textiles — vegans avoid it because it is insect-derived.', M, h - M);
  }
}

new Cochineal();
