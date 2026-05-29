import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { hash2 } from '@core/render/halftone';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const GAIN_PX = 1.1; // edge growth when press dot gain is on

class StochasticClustered {
  private stage: CanvasStage;
  private tint = 35;
  private gain = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tint = hydrateNumber('tint', 35);
    this.gain = hydrateFromUrl('gain') ?? 'off';
    const s = document.getElementById('tint') as EncSlider;
    s.value = this.tint;
    s.addEventListener('input', (e) => { this.tint = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tint', () => Math.round(this.tint));
    const t = document.getElementById('gain') as EncToggle;
    t.value = this.gain;
    t.addEventListener('change', (e) => { this.gain = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('gain', () => this.gain);
    document.addEventListener('reset-params', () => { this.tint = 35; this.gain = 'off'; s.value = 35; t.value = 'off'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, w, h);
    const c = this.tint / 100;
    const g = this.gain === 'on' ? GAIN_PX : 0;
    const pad = 36, gapX = 40, pw = (w - pad * 2 - gapX) / 2, ph = h - 150, py = 70;
    const lx = pad, rx = pad + pw + gapX;

    // Clustered (AM): grid of large dots
    const cell = 18, rClust = cell * Math.sqrt(c / Math.PI);
    ctx.fillStyle = '#1a1714';
    for (let y = py + cell / 2; y < py + ph; y += cell) for (let x = lx + cell / 2; x < lx + pw; x += cell) {
      ctx.beginPath(); ctx.arc(x, y, rClust + g, 0, Math.PI * 2); ctx.fill();
    }
    const clustEff = Math.min(1, (Math.PI * (rClust + g) * (rClust + g)) / (cell * cell)) * 100;

    // Stochastic (FM): fine grid, equal tiny dots, density = coverage.
    // Dot area ≈ one cell so that at gain-off the geometric tone equals the tint.
    const fg = 4, rStoch = fg / Math.sqrt(Math.PI);
    let nDots = 0, nCells = 0;
    ctx.fillStyle = '#1a1714';
    for (let y = py + fg / 2; y < py + ph; y += fg) for (let x = rx + fg / 2; x < rx + pw; x += fg) {
      nCells++;
      if (hash2(x, y) < c) { nDots++; ctx.beginPath(); ctx.arc(x, y, rStoch + g, 0, Math.PI * 2); ctx.fill(); }
    }
    const stochEff = Math.min(100, (nDots * Math.PI * (rStoch + g) * (rStoch + g)) / (nCells * fg * fg) * 100);

    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1;
    ctx.strokeRect(lx, py, pw, ph); ctx.strokeRect(rx, py, pw, ph);
    ctx.fillStyle = theme.ink; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('clustered (AM)', lx + pw / 2, py - 14); ctx.fillText('stochastic (FM)', rx + pw / 2, py - 14);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`effective tone ${clustEff.toFixed(0)}%`, lx + pw / 2, py + ph + 22);
    ctx.fillText(`effective tone ${stochEff.toFixed(0)}%`, rx + pw / 2, py + ph + 22);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.gain === 'on'
      ? `with dot gain, FM darkens to ${stochEff.toFixed(0)}% vs AM ${clustEff.toFixed(0)}% — more edge, more spread`
      : `both set to a ${Math.round(this.tint)}% tint — turn on dot gain to see FM darken faster`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new StochasticClustered());
