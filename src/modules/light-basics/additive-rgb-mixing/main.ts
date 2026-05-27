import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class AdditiveRgb {
  private stage: CanvasStage;
  private r = 1.0;
  private g = 1.0;
  private b = 1.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.r = hydrateNumber('r', 100) / 100;
    this.g = hydrateNumber('g', 100) / 100;
    this.b = hydrateNumber('b', 100) / 100;
    (document.getElementById('r') as EncSlider).value = this.r * 100;
    (document.getElementById('g') as EncSlider).value = this.g * 100;
    (document.getElementById('b') as EncSlider).value = this.b * 100;

    registerStateParam('r', () => Math.round(this.r * 100));
    registerStateParam('g', () => Math.round(this.g * 100));
    registerStateParam('b', () => Math.round(this.b * 100));

    (document.getElementById('r') as EncSlider).addEventListener('input', (e) => {
      this.r = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    (document.getElementById('g') as EncSlider).addEventListener('input', (e) => {
      this.g = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    (document.getElementById('b') as EncSlider).addEventListener('input', (e) => {
      this.b = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });

    document.addEventListener('reset-params', () => {
      this.r = 1; this.g = 1; this.b = 1;
      (document.getElementById('r') as EncSlider).value = 100;
      (document.getElementById('g') as EncSlider).value = 100;
      (document.getElementById('b') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 + 10;
    const radius = Math.min(w, h) * 0.22;
    const offset = radius * 0.6;

    ctx.globalCompositeOperation = 'lighter'; // additive blending

    // Red beam (top)
    ctx.fillStyle = `rgba(255, 0, 0, ${this.r})`;
    ctx.beginPath(); ctx.arc(cx, cy - offset, radius, 0, Math.PI * 2); ctx.fill();

    // Green (bottom-left)
    ctx.fillStyle = `rgba(0, 255, 0, ${this.g})`;
    ctx.beginPath(); ctx.arc(cx - offset * 0.866, cy + offset * 0.5, radius, 0, Math.PI * 2); ctx.fill();

    // Blue (bottom-right)
    ctx.fillStyle = `rgba(0, 0, 255, ${this.b})`;
    ctx.beginPath(); ctx.arc(cx + offset * 0.866, cy + offset * 0.5, radius, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Labels around outside (paper-coloured for legibility on ink)
    ctx.fillStyle = theme.paper;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('R', cx - 6, cy - offset - radius - 12);
    ctx.fillText('G', cx - offset * 0.866 - radius - 14, cy + offset * 0.5 + 5);
    ctx.fillText('B', cx + offset * 0.866 + radius + 6, cy + offset * 0.5 + 5);

    // Readout in paper rectangle at top
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    const sum = `rgb(${Math.round(this.r * 255)}, ${Math.round(this.g * 255)}, ${Math.round(this.b * 255)})`;
    ctx.fillText(`R = ${(this.r * 100).toFixed(0)}%   G = ${(this.g * 100).toFixed(0)}%   B = ${(this.b * 100).toFixed(0)}%`, 16, 22);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`center pixel ≈ ${sum}`, w - 220, 22);
    void axisStyle;
  }
}

window.addEventListener('DOMContentLoaded', () => new AdditiveRgb());
