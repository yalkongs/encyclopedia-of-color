import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Coma {
  private stage: CanvasStage;
  private f = 0.6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.f = hydrateNumber('f', 0.6);
    const s = document.getElementById('f') as EncSlider; s.value = this.f;
    s.addEventListener('input', (e) => { this.f = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('f', () => this.f.toFixed(2));
    document.addEventListener('reset-params', () => { this.f = 0.6; s.value = 0.6; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`field angle θ_f = ${this.f.toFixed(2)} (relative) · PSF tail length ∝ θ_f`, M, M);

    // Image plane mockup with comet PSF
    const px = M, py = M + 40, pw = (w - 2 * M) * 0.55, ph = h - 2 * M - 80;
    g.fillStyle = '#1a1a1a'; g.fillRect(px, py, pw, ph);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(px, py, pw, ph);
    // Centre PSF (Airy disk small)
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px + pw / 2, py + ph / 2, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('on-axis: sharp Airy disk', px + pw / 2, py + ph / 2 - 14);

    // Off-axis comet PSF
    const cx0 = px + pw * 0.75, cy0 = py + ph * 0.4;
    const tailLen = 60 * this.f;
    const tipR = 5;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(cx0, cy0, tipR, 0, Math.PI * 2); g.fill();
    // Comet tail: stacked circles of decreasing intensity
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const x = cx0 - t * tailLen * 0.6;
      const y = cy0 + t * tailLen * 0.4;
      const r = tipR + t * tailLen * 0.18;
      g.fillStyle = `rgba(255,255,255,${0.6 * (1 - t)})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#fff'; g.font = '11px serif';
    g.fillStyle = '#fff'; g.fillText('off-axis: comet PSF', cx0, cy0 + tailLen + 24);

    // Field-vs-axis sketch (right)
    const sx = px + pw + 30, sy = py + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('how it forms', sx, sy);

    // Lens
    const lensY = sy + 130;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(sx + 40, lensY - 80); g.lineTo(sx + 40, lensY + 80); g.stroke();
    // Optical axis
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(sx, lensY); g.lineTo(sx + 260, lensY); g.stroke(); g.setLineDash([]);
    // Off-axis source: angled bundle
    const tilt = 0.3 * this.f;
    for (let i = -3; i <= 3; i++) {
      const yEntry = lensY + i * 18;
      const yEntryAngle = Math.atan2(yEntry - lensY, 0); void yEntryAngle;
      // Incoming tilted ray
      g.strokeStyle = `rgba(190,60,40,${0.3 + 0.3 * (1 - Math.abs(i) / 3)})`; g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(sx, yEntry + 50 * tilt); g.lineTo(sx + 40, yEntry); g.stroke();
      // Each zone focuses to a slightly different point
      const focalShift = Math.abs(i) * 6 * this.f;
      const focalY = lensY + 40 * tilt + focalShift * Math.sign(-i);
      g.beginPath();
      g.moveTo(sx + 40, yEntry); g.lineTo(sx + 220, focalY); g.stroke();
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('off-axis bundle → comet spread on image plane', sx + 130, lensY + 110);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Abbe sine condition zeros coma at one zone. Microscope objectives are designed "aplanatic" (no SA + no coma).', M, h - M);
  }
}

new Coma();
