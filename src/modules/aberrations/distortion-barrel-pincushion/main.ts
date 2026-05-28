import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Distortion {
  private stage: CanvasStage;
  private k1 = -0.25;
  private k2 = 0.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.k1 = hydrateNumber('k1', -0.25);
    this.k2 = hydrateNumber('k2', 0.0);
    (document.getElementById('k1') as EncSlider).value = this.k1;
    (document.getElementById('k2') as EncSlider).value = this.k2;
    registerStateParam('k1', () => this.k1);
    registerStateParam('k2', () => this.k2);
    for (const id of ['k1', 'k2']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'k1') this.k1 = v; else this.k2 = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.k1 = -0.25; this.k2 = 0.0;
      (document.getElementById('k1') as EncSlider).value = -0.25;
      (document.getElementById('k2') as EncSlider).value = 0.0;
      this.draw(); notifyStateChange();
    });
  }

  // Radial distortion map: normalized (u,v) in [-1,1] → distorted.
  private distort(u: number, v: number): [number, number] {
    const r2 = u * u + v * v;
    const s = 1 + this.k1 * r2 + this.k2 * r2 * r2;
    return [u * s, v * s];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5, cy = h * 0.52;
    const R = Math.min(w, h) * 0.40;
    const N = 8; // grid lines per side

    // Reference (undistorted) grid — faint.
    ctx.strokeStyle = theme.inkAlpha(0.18); ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      const t = -1 + (2 * i) / N;
      ctx.beginPath(); ctx.moveTo(cx + t * R, cy - R); ctx.lineTo(cx + t * R, cy + R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R, cy + t * R); ctx.lineTo(cx + R, cy + t * R); ctx.stroke();
    }

    // Distorted grid — crimson.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.6;
    const samp = 40;
    // Vertical lines.
    for (let i = 0; i <= N; i++) {
      const u = -1 + (2 * i) / N;
      ctx.beginPath();
      for (let j = 0; j <= samp; j++) {
        const v = -1 + (2 * j) / samp;
        const [du, dv] = this.distort(u, v);
        const px = cx + du * R, py = cy + dv * R;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Horizontal lines.
    for (let i = 0; i <= N; i++) {
      const v = -1 + (2 * i) / N;
      ctx.beginPath();
      for (let j = 0; j <= samp; j++) {
        const u = -1 + (2 * j) / samp;
        const [du, dv] = this.distort(u, v);
        const px = cx + du * R, py = cy + dv * R;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Classify.
    let kind: string;
    if (Math.abs(this.k1) < 0.02 && Math.abs(this.k2) < 0.02) kind = 'rectilinear (no distortion)';
    else if (this.k1 < 0 && this.k2 > 0.05) kind = 'moustache (barrel→pincushion)';
    else if (this.k1 > 0 && this.k2 < -0.05) kind = 'moustache (pincushion→barrel)';
    else if (this.k1 + 0.5 * this.k2 < 0) kind = 'barrel distortion';
    else kind = 'pincushion distortion';

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`k₁ = ${this.k1.toFixed(2)}   k₂ = ${this.k2.toFixed(2)}`, 16, 28);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(kind, 16, 50);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('faint = scene · crimson = distorted image', 16, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Distortion());
