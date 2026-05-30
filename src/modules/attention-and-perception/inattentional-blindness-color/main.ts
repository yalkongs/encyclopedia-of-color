import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class IB {
  private stage: CanvasStage;
  private s = 0.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.s = hydrateNumber('s', 0.5);
    const s = document.getElementById('s') as EncSlider; s.value = this.s;
    s.addEventListener('input', (e) => { this.s = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('s', () => this.s.toFixed(2));
    document.addEventListener('reset-params', () => { this.s = 0.5; s.value = 0.5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Detection probability: ranges from 0.05 (low salience) to 0.95 (high salience)
    const detect = 0.05 + 0.9 * this.s;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`salience = ${this.s.toFixed(2)} · expected detection ≈ ${(detect * 100).toFixed(0)} %`, M, M);

    // Scene
    const sx = M, sy = M + 30, sw = (w - 2 * M) * 0.6, sh = h - 2 * M - 80;
    g.fillStyle = '#c0c0c5'; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, sw, sh);
    // White-shirt + black-shirt players (the counting task)
    for (let i = 0; i < 6; i++) {
      const px = sx + 40 + (i % 3) * (sw - 80) / 3;
      const py = sy + 50 + Math.floor(i / 3) * (sh - 100) / 2;
      // Body
      g.fillStyle = (i % 2 === 0) ? '#f0f0f0' : '#1a1a1a';
      g.fillRect(px - 12, py - 18, 24, 36);
      // Head
      g.fillStyle = '#e0c0a0';
      g.beginPath(); g.arc(px, py - 28, 8, 0, Math.PI * 2); g.fill();
    }
    // Unexpected "gorilla" object — salience-dependent
    const gx = sx + sw / 2, gy = sy + sh / 2;
    // Colour from achromatic grey (low s) to saturated red (high s)
    const cR = Math.round(80 + 170 * this.s);
    const cG = Math.round(80 - 60 * this.s);
    const cB = Math.round(80 - 60 * this.s);
    g.fillStyle = `rgb(${cR},${cG},${cB})`;
    g.beginPath(); g.ellipse(gx, gy, 28, 40, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgb(${cR},${cG},${cB})`;
    g.beginPath(); g.arc(gx, gy - 35, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1;
    g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('count the white-shirt passes (and try not to look at the centre)', sx + sw / 2, sy + sh + 16);

    // Detection probability curve
    const rx = sx + sw + 30, ry = sy + 20, rw = w - rx - M, rh = 220;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(rx, ry, rw, rh);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('P(detect unexpected object)', rx + rw / 2, ry - 4);
    const X = (s: number) => rx + s * rw;
    const Y = (p: number) => ry + (1 - p) * rh;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let ss = 0; ss <= 1.0; ss += 0.02) {
      const p = 0.05 + 0.9 * ss;
      const x = X(ss), y = Y(p);
      if (ss === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.s), Y(detect), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('grey-on-grey', rx, ry + rh + 14);
    g.textAlign = 'right'; g.fillText('saturated colour', rx + rw, ry + rh + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Designers fight inattentional blindness with saturated red for warnings, motion for ads, and centre-of-screen-placement for CTAs.', M, h - M);
  }
}

new IB();
