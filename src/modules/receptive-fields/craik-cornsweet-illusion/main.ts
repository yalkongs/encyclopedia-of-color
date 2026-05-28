import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const BASE = 0.5;
const CUSP_HALF = 0.16; // fraction of width over which each side ramps

class Cornsweet {
  private stage: CanvasStage;
  private amp = 0.16;
  private cover: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.amp = hydrateNumber('amp', 0.16);
    this.cover = (hydrateFromUrl('cover') as 'off' | 'on') ?? 'off';
    (document.getElementById('amp') as EncSlider).value = this.amp;
    (document.getElementById('cover') as EncToggle).value = this.cover;
    registerStateParam('amp', () => this.amp);
    registerStateParam('cover', () => this.cover);
    (document.getElementById('amp') as EncSlider).addEventListener('input', (e) => {
      this.amp = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('cover') as EncToggle).addEventListener('change', (e) => {
      this.cover = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.amp = 0.16; this.cover = 'off';
      (document.getElementById('amp') as EncSlider).value = 0.16;
      (document.getElementById('cover') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  /** Cornsweet luminance at fractional position t∈[0,1]. */
  private lum(t: number): number {
    const d = t - 0.5;
    const ad = Math.abs(d);
    if (ad > CUSP_HALF) return BASE;
    const ramp = (1 - ad / CUSP_HALF) * this.amp; // peaks at centre, 0 at cusp edge
    return d < 0 ? BASE + ramp : BASE - ramp;     // bright lip left, dark lip right
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 44;
    const plotX = pad, plotW = Math.max(10, w - pad * 1.4);
    const n = Math.round(plotW);

    // --- Stimulus strip. ---
    const stripY = 50, stripH = h * 0.36;
    for (let i = 0; i < n; i++) {
      const g = Math.round(this.lum(i / (n - 1)) * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(plotX + i, stripY, 1, stripH);
    }
    // Cover the central cusp with a neutral occluder.
    if (this.cover === 'on') {
      const cw = plotW * 0.10;
      ctx.fillStyle = theme.paper;
      ctx.fillRect(plotX + plotW / 2 - cw / 2, stripY - 6, cw, stripH + 12);
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(plotX, stripY, n, stripH);

    // Region annotations.
    ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
    if (this.cover === 'on') {
      ctx.fillStyle = theme.inkMute;
      ctx.fillText('edge hidden → both sides read as the same grey', plotX + plotW / 2, stripY - 12);
    } else {
      ctx.fillStyle = theme.inkMute;
      ctx.fillText('looks lighter', plotX + plotW * 0.25, stripY - 12);
      ctx.fillText('looks darker', plotX + plotW * 0.75, stripY - 12);
    }
    ctx.textAlign = 'left';

    // --- Luminance profile. ---
    const py = stripY + stripH + 42, ph = h - py - 44;
    const lo = BASE - 0.36, hi = BASE + 0.36;
    const yOf = (v: number) => py + (1 - (v - lo) / (hi - lo)) * ph;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, yOf(BASE)); ctx.lineTo(plotX + n, yOf(BASE)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('equal baseline', plotX + 4, yOf(BASE) - 4);

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i < n; i++) { const X = plotX + i, Y = yOf(this.lum(i / (n - 1))); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`cusp height ${this.amp.toFixed(2)}   ·   plateaus identical at ${BASE.toFixed(2)}`, plotX, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Cornsweet());
