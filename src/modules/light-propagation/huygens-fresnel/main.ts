import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class HuygensFresnel {
  private stage: CanvasStage;
  private slitWidth = 80;
  private lambda = 60;       // pixel wavelength

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.slitWidth = hydrateNumber('a', 80);
    this.lambda = hydrateNumber('lambda', 60);
    (document.getElementById('a') as EncSlider).value = this.slitWidth;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;

    registerStateParam('a', () => this.slitWidth);
    registerStateParam('lambda', () => this.lambda);

    (document.getElementById('a') as EncSlider).addEventListener('input', (e) => {
      this.slitWidth = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.slitWidth = 80; this.lambda = 60;
      (document.getElementById('a') as EncSlider).value = 80;
      (document.getElementById('lambda') as EncSlider).value = 60;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const slitX = w * 0.35;
    const cy = h / 2;

    // Incoming plane wavefronts (left side) — vertical lines
    ctx.strokeStyle = theme.inkAlpha(0.35);
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const x = slitX - i * this.lambda;
      if (x < 0) break;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 30); ctx.stroke();
    }

    // Slit wall — block above and below the slit opening
    ctx.fillStyle = theme.ink;
    ctx.fillRect(slitX - 4, 30, 8, cy - this.slitWidth / 2 - 30);
    ctx.fillRect(slitX - 4, cy + this.slitWidth / 2, 8, (h - 30) - (cy + this.slitWidth / 2));

    // Secondary wavelets from a row of source points inside the slit
    const N = Math.max(3, Math.min(40, Math.floor(this.slitWidth / 5)));
    const sources: { x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) {
      const y = cy - this.slitWidth / 2 + ((i + 0.5) * this.slitWidth) / N;
      sources.push({ x: slitX, y });
    }

    // Draw circular wavelets — concentric arcs at multiples of lambda
    ctx.strokeStyle = theme.goldAlpha(0.18);
    ctx.lineWidth = 1;
    for (const src of sources) {
      for (let r = this.lambda; r < w - slitX; r += this.lambda) {
        ctx.beginPath();
        ctx.arc(src.x, src.y, r, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
    }

    // Source-point markers
    ctx.fillStyle = theme.goldDeep;
    for (const src of sources) {
      ctx.beginPath(); ctx.arc(src.x, src.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Diffraction-spread cone (approximate — half-angle ≈ λ/a)
    const sinHalf = Math.min(0.95, this.lambda / this.slitWidth);
    const cosHalf = Math.sqrt(1 - sinHalf * sinHalf);
    ctx.strokeStyle = theme.crimson;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(slitX, cy);
    ctx.lineTo(slitX + (w - slitX) * cosHalf,  cy - (w - slitX) * sinHalf);
    ctx.moveTo(slitX, cy);
    ctx.lineTo(slitX + (w - slitX) * cosHalf,  cy + (w - slitX) * sinHalf);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('plane wave →', 16, cy);
    ctx.fillText('secondary wavelets →', slitX + 12, cy + this.slitWidth + 18);

    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`slit a = ${this.slitWidth} px`, 16, 28);
    ctx.fillText(`λ = ${this.lambda} px`, 16, 50);
    ctx.fillText(`a/λ = ${(this.slitWidth / this.lambda).toFixed(2)}`, 16, 72);
    ctx.fillStyle = theme.crimson;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`first-null half-angle ≈ ${(Math.asin(sinHalf) * 180 / Math.PI).toFixed(1)}°`, 16, 94);
    void axisStyle;
  }
}

window.addEventListener('DOMContentLoaded', () => new HuygensFresnel());
