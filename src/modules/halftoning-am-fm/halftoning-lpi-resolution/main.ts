import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { clusteredScreen } from '@core/render/halftone';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class LpiResolution {
  private stage: CanvasStage;
  private lpi = 150;
  private dpi = '600';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lpi = hydrateNumber('lpi', 150);
    this.dpi = hydrateFromUrl('dpi') ?? '600';
    const s = document.getElementById('lpi') as EncSlider;
    s.value = this.lpi;
    s.addEventListener('input', (e) => { this.lpi = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lpi', () => Math.round(this.lpi));
    const t = document.getElementById('dpi') as EncToggle;
    t.value = this.dpi;
    t.addEventListener('change', (e) => { this.dpi = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dpi', () => this.dpi);
    document.addEventListener('reset-params', () => { this.lpi = 150; this.dpi = '600'; s.value = 150; t.value = '600'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, w, h);
    const dpi = parseInt(this.dpi, 10);
    const cellDots = dpi / this.lpi;
    const levels = Math.floor(cellDots * cellDots) + 1;
    const x0 = 30, x1 = w - 30, gw = x1 - x0;

    // quantised continuous-tone ramp (shows how many greys survive)
    const ry = 40, rh = 70;
    for (let px = 0; px < gw; px++) {
      const c = px / gw;
      const q = Math.round(c * (levels - 1)) / (levels - 1);
      const g = Math.round((1 - q) * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(x0 + px, ry, 1, rh);
    }
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x0, ry, gw, rh);
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`tone ramp quantised to ${levels} grey levels`, x0, ry - 10);

    // screened ramp at the matching cell pitch
    const sy = ry + rh + 50, sh = h - sy - 60;
    const cellPx = Math.max(4, Math.min(40, 1800 / this.lpi));
    clusteredScreen(ctx, x0, sy, x1, sy + sh, cellPx, 45, '#1a1714',
      (x) => { const c = (x - x0) / gw; return Math.round(c * (levels - 1)) / (levels - 1); }, { bg: '#f7f5ef' });
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.strokeRect(x0, sy, gw, sh);
    ctx.fillStyle = theme.ink; ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(this.lpi)} LPI clustered-dot screen (cell ≈ ${cellDots.toFixed(1)} device dots wide)`, x0, sy - 10);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${dpi} dpi ÷ ${Math.round(this.lpi)} LPI → ${levels} grey levels — finer screens trade tones for detail`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new LpiResolution());
