import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { simulateBrettel, daltonize } from '@core/math/cvd';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type RGB = { r: number; g: number; b: number };
// Red-green confusable palette.
const PALETTE: RGB[] = [
  { r: 0.78, g: 0.18, b: 0.16 }, { r: 0.74, g: 0.42, b: 0.12 }, { r: 0.62, g: 0.55, b: 0.12 },
  { r: 0.38, g: 0.58, b: 0.18 }, { r: 0.20, g: 0.55, b: 0.28 }, { r: 0.52, g: 0.36, b: 0.20 },
  { r: 0.66, g: 0.30, b: 0.30 }, { r: 0.45, g: 0.52, b: 0.24 },
];
const css = (c: RGB) => `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
const lerp = (a: RGB, b: RGB, t: number): RGB => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });

class CvdAnomaly {
  private stage: CanvasStage;
  private sev = 80;
  private dalt: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sev = hydrateNumber('sev', 80);
    this.dalt = (hydrateFromUrl('dalt') as 'off' | 'on') ?? 'off';
    (document.getElementById('sev') as EncSlider).value = this.sev;
    (document.getElementById('dalt') as EncToggle).value = this.dalt;
    registerStateParam('sev', () => this.sev);
    registerStateParam('dalt', () => this.dalt);
    (document.getElementById('sev') as EncSlider).addEventListener('input', (e) => {
      this.sev = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('dalt') as EncToggle).addEventListener('change', (e) => {
      this.dalt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.sev = 80; this.dalt = 'off';
      (document.getElementById('sev') as EncSlider).value = 80;
      (document.getElementById('dalt') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  /** What a deuteranomalous observer (given severity) sees of colour c. */
  private observed(c: RGB): RGB {
    const input = this.dalt === 'on' ? daltonize(c, 'deuteranopia') : c;
    return lerp(input, simulateBrettel(input, 'deuteranopia'), this.sev / 100);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const n = PALETTE.length, pad = 40, gap = 8;
    const sw = (w - pad * 2 - gap * (n - 1)) / n, sh = h * 0.26;
    const topY = 64, botY = topY + sh + 56;

    PALETTE.forEach((c, i) => {
      const x = pad + i * (sw + gap);
      ctx.fillStyle = css(c); ctx.fillRect(x, topY, sw, sh);
      ctx.fillStyle = css(this.observed(c)); ctx.fillRect(x, botY, sw, sh);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
      ctx.strokeRect(x, topY, sw, sh); ctx.strokeRect(x, botY, sw, sh);
    });

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('true palette', pad, topY - 10);
    ctx.fillText(`deuteranomalous observer${this.dalt === 'on' ? ' · Daltonized input' : ''}`, pad, botY - 10);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(this.dalt === 'on'
      ? 'Daltonization re-routes red-green contrast — the bottom row separates again'
      : `severity ${this.sev}% — red-green pairs blur together for the observer`, pad, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new CvdAnomaly());
