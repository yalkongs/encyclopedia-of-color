import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { BREWER } from '@core/math/colormaps';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const BY_TYPE: Record<string, string[]> = {
  sequential: ['Blues', 'YlOrRd'],
  diverging: ['RdYlBu', 'BrBG'],
  qualitative: ['Set2', 'Dark2'],
};
const USE: Record<string, string> = {
  sequential: 'ordered magnitude — low to high (population, temperature)',
  diverging: 'deviation from a midpoint — below vs above a baseline (anomaly, profit/loss)',
  qualitative: 'unordered categories — maximally distinct, no implied order',
};

class ColorBrewer {
  private stage: CanvasStage;
  private type = 'sequential';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.type = hydrateFromUrl('type') ?? 'sequential';
    const t = document.getElementById('type') as EncToggle;
    t.value = this.type;
    t.addEventListener('change', (e) => { this.type = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('type', () => this.type);
    document.addEventListener('reset-params', () => { this.type = 'sequential'; t.value = 'sequential'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const names = BY_TYPE[this.type];
    const x0 = 30, blockH = (h - 110) / 2;

    names.forEach((name, n) => {
      const sch = BREWER[name];
      const y = 44 + n * (blockH + 18);
      ctx.fillStyle = theme.inkSoft; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(name, x0, y - 8);
      // swatch row
      const sw = (w - 60) / sch.colors.length, sh = blockH * 0.5;
      sch.colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x0 + i * sw, y, sw - 1, sh); });
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y, sw * sch.colors.length - 1, sh);
      // sample chart
      const cy = y + sh + 10, cw = w - 60, chh = blockH * 0.5 - 12;
      const N = 12;
      for (let i = 0; i < N; i++) {
        const bx = x0 + i * (cw / N);
        let col: string, bh: number;
        if (this.type === 'sequential') { col = sch.colors[Math.floor((i / (N - 1)) * (sch.colors.length - 1))]; bh = chh * (0.3 + 0.7 * i / (N - 1)); }
        else if (this.type === 'diverging') { col = sch.colors[Math.floor((i / (N - 1)) * (sch.colors.length - 1))]; bh = chh * (0.3 + 0.7 * Math.abs(i - (N - 1) / 2) / ((N - 1) / 2)); }
        else { col = sch.colors[i % sch.colors.length]; bh = chh * (0.4 + 0.5 * Math.abs(Math.sin(i * 1.3))); }
        ctx.fillStyle = col; ctx.fillRect(bx + 2, cy + chh - bh, cw / N - 4, bh);
      }
    });
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${this.type}: ${USE[this.type]}`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ColorBrewer());
