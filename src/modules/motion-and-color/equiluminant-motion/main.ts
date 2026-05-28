import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const RED: [number, number, number] = [206, 54, 44];
const GREEN_FULL: [number, number, number] = [44, 184, 70];
const BAR_W = 36;
const DRIFT = 70; // px/s

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

class Equiluminant {
  private stage: CanvasStage;
  private green = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.green = hydrateNumber('green', 100);
    (document.getElementById('green') as EncSlider).value = this.green;
    registerStateParam('green', () => this.green);
    (document.getElementById('green') as EncSlider).addEventListener('input', (e) => {
      this.green = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.green = 100;
      (document.getElementById('green') as EncSlider).value = 100;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const scale = this.green / 100;
    const green: [number, number, number] = [GREEN_FULL[0] * scale, GREEN_FULL[1] * scale, GREEN_FULL[2] * scale];
    const Lr = luma(...RED), Lg = luma(...green);
    const cLum = Math.abs(Lr - Lg) / (Lr + Lg);

    const offset = (t * DRIFT) % (BAR_W * 2);
    const margin = 40;
    const gx = margin, gw = w - margin * 2;
    const colourY = 56, colourH = h * 0.34;
    const lumY = colourY + colourH + 44, lumH = h * 0.30;

    // Colour grating (drifts).
    for (let x = 0; x < gw; x++) {
      const phase = Math.floor((x + offset) / BAR_W);
      const c = phase % 2 === 0 ? RED : green;
      ctx.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
      ctx.fillRect(gx + x, colourY, 1, colourH);
    }
    // Luminance-only rendering of the same grating.
    for (let x = 0; x < gw; x++) {
      const phase = Math.floor((x + offset) / BAR_W);
      const L = phase % 2 === 0 ? Lr : Lg;
      const v = Math.round(L);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(gx + x, lumY, 1, lumH);
    }

    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(gx, colourY, gw, colourH);
    ctx.strokeRect(gx, lumY, gw, lumH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('colour grating (always drifting)', gx, colourY - 8);
    ctx.fillText('luminance channel — what the motion system sees', gx, lumY - 8);

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    const verdict = cLum < 0.03 ? 'equiluminant — motion stalls' : cLum < 0.12 ? 'weak luminance contrast — motion falters' : 'strong motion signal';
    ctx.fillText(`luminance contrast = ${(cLum * 100).toFixed(1)}%   ·   ${verdict}`, gx, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Equiluminant());
