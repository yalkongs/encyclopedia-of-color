import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

function rng(i: number): number { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const COVERAGE = [
  { label: 'sRGB LED backlight', pct: 0.74, col: '#9a8f7a' },
  { label: 'wide-gamut LED', pct: 0.88, col: '#c7973a' },
  { label: 'RGB laser', pct: 0.98, col: '#b0392f' },
];

class Laser {
  private stage: CanvasStage;
  private despeckle = 0;
  private view = 'speckle';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.despeckle = hydrateNumber('despeckle', 0);
    this.view = hydrateFromUrl('view') ?? 'speckle';
    const s = document.getElementById('despeckle') as EncSlider;
    s.value = this.despeckle;
    s.addEventListener('input', (e) => { this.despeckle = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('despeckle', () => Math.round(this.despeckle));
    const t = document.getElementById('view') as EncToggle;
    t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.despeckle = 0; this.view = 'speckle'; s.value = 0; t.value = 'speckle'; this.draw(); notifyStateChange(); });
  }

  private drawSpeckle(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const x0 = 40, y0 = 40, sw = w - 80, sh = h - 110;
    const amp = 1 - this.despeckle / 100;               // speckle contrast
    const base: [number, number, number] = [150, 150, 160]; // a flat lit field
    const cell = 3;
    for (let y = 0; y < sh; y += cell) {
      for (let x = 0; x < sw; x += cell) {
        // multiplicative speckle: product of a few coherent noise samples
        const n1 = rng(x * 0.7 + y * 13.1), n2 = rng(x * 5.3 - y * 2.9);
        const speck = (n1 * n2); // skewed toward dark, like real speckle intensity
        const f = 1 - amp + amp * (0.3 + 1.7 * speck);
        const r = Math.min(255, base[0] * f), g = Math.min(255, base[1] * f), b = Math.min(255, base[2] * f);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x0 + x, y0 + y, cell + 0.5, cell + 0.5);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, sw, sh);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.despeckle >= 95
      ? 'despeckled — many decorrelated states average the grain into a smooth field'
      : `coherent laser light — ${Math.round(100 - this.despeckle)}% speckle contrast shimmers across the projected field`, w / 2, h - 14);
  }

  private drawGamut(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const x0 = 200, y0 = 70, bw = w - x0 - 120, bh = (h - 170) / COVERAGE.length;
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif';
    COVERAGE.forEach((c, i) => {
      const y = y0 + i * bh;
      ctx.fillStyle = theme.inkAlpha(0.08); ctx.fillRect(x0, y, bw, bh * 0.6);
      ctx.fillStyle = c.col; ctx.fillRect(x0, y, bw * c.pct, bh * 0.6);
      ctx.fillStyle = theme.ink; ctx.textAlign = 'right'; ctx.font = '13px Inter, sans-serif';
      ctx.fillText(c.label, x0 - 14, y + bh * 0.36);
      ctx.fillStyle = theme.inkSoft; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`${Math.round(c.pct * 100)}% Rec. 2020`, x0 + bw * c.pct + 8, y + bh * 0.36);
    });
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('near-monochromatic laser primaries sit on the spectral locus — almost the whole Rec. 2020 gamut', w / 2, h - 14);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    if (this.view === 'speckle') this.drawSpeckle(ctx, w, h); else this.drawGamut(ctx, w, h);
  }
}
window.addEventListener('DOMContentLoaded', () => new Laser());
