import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Subtractive CMY: each filter has a transmission triplet over RGB.
 *   cyan    blocks R, passes G, B
 *   magenta blocks G, passes R, B
 *   yellow  blocks B, passes R, G
 *
 * The effective RGB through stacked filters multiplies each filter's transmission.
 */
class SubtractiveCmy {
  private stage: CanvasStage;
  private c = 1.0;
  private m = 1.0;
  private y = 1.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.c = hydrateNumber('c', 100) / 100;
    this.m = hydrateNumber('m', 100) / 100;
    this.y = hydrateNumber('y', 100) / 100;
    (document.getElementById('c') as EncSlider).value = this.c * 100;
    (document.getElementById('m') as EncSlider).value = this.m * 100;
    (document.getElementById('y') as EncSlider).value = this.y * 100;

    registerStateParam('c', () => Math.round(this.c * 100));
    registerStateParam('m', () => Math.round(this.m * 100));
    registerStateParam('y', () => Math.round(this.y * 100));

    (document.getElementById('c') as EncSlider).addEventListener('input', (e) => {
      this.c = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    (document.getElementById('m') as EncSlider).addEventListener('input', (e) => {
      this.m = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    (document.getElementById('y') as EncSlider).addEventListener('input', (e) => {
      this.y = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.c = 1; this.m = 1; this.y = 1;
      (document.getElementById('c') as EncSlider).value = 100;
      (document.getElementById('m') as EncSlider).value = 100;
      (document.getElementById('y') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 + 10;
    const radius = Math.min(w, h) * 0.22;
    const offset = radius * 0.6;

    // Subtractive: model filters as multiplying transmission over base white.
    // Each filter passes light at its complementary range.
    //  C(d) over white: rgb(255*(1-d), 255, 255)
    //  M(d) over white: rgb(255, 255*(1-d), 255)
    //  Y(d) over white: rgb(255, 255, 255*(1-d))
    // We composite with multiply blending to combine them.
    ctx.globalCompositeOperation = 'multiply';

    const cyanRgb    = `rgb(${Math.round(255*(1-this.c))}, 255, 255)`;
    const magentaRgb = `rgb(255, ${Math.round(255*(1-this.m))}, 255)`;
    const yellowRgb  = `rgb(255, 255, ${Math.round(255*(1-this.y))})`;

    ctx.fillStyle = cyanRgb;
    ctx.beginPath(); ctx.arc(cx, cy - offset, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = magentaRgb;
    ctx.beginPath(); ctx.arc(cx - offset * 0.866, cy + offset * 0.5, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = yellowRgb;
    ctx.beginPath(); ctx.arc(cx + offset * 0.866, cy + offset * 0.5, radius, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Labels
    ctx.fillStyle = theme.ink;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('C', cx - 6, cy - offset - radius - 12);
    ctx.fillText('M', cx - offset * 0.866 - radius - 14, cy + offset * 0.5 + 5);
    ctx.fillText('Y', cx + offset * 0.866 + radius + 6, cy + offset * 0.5 + 5);

    // Centre readout — RGB surviving the three-filter stack
    const r2 = Math.round(255 * (1 - this.m) * (1 - this.y));
    const g2 = Math.round(255 * (1 - this.c) * (1 - this.y));
    const b2 = Math.round(255 * (1 - this.c) * (1 - this.m));

    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`C = ${(this.c*100).toFixed(0)}%   M = ${(this.m*100).toFixed(0)}%   Y = ${(this.y*100).toFixed(0)}%`, 16, 28);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`triple-overlap ≈ rgb(${r2}, ${g2}, ${b2}) — approaches black`, 16, h - 22);
  }
}

window.addEventListener('DOMContentLoaded', () => new SubtractiveCmy());
