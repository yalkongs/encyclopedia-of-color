import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { clusteredScreen } from '@core/render/halftone';
import { rgbToCmyk } from '@core/math/print';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const CELL = 7;
const INK: Record<string, { ang: number; col: string }> = {
  c: { ang: 15, col: '#00aeef' }, m: { ang: 75, col: '#ec008c' },
  y: { ang: 90, col: '#fff200' }, k: { ang: 45, col: '#231f20' },
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2; return [r + m, g + m, b + m];
}

class Separation {
  private stage: CanvasStage;
  private view = 'composite';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.view = hydrateFromUrl('view') ?? 'composite';
    const t = document.getElementById('view') as EncToggle;
    t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.view = 'composite'; t.value = 'composite'; this.draw(); notifyStateChange(); });
  }

  private plateCoverage(x: number, y: number, x0: number, y0: number, gw: number, gh: number, ch: 'c' | 'm' | 'y' | 'k'): number {
    const u = (x - x0) / gw, v = (y - y0) / gh;
    const [r, g, b] = hslToRgb(u * 360, 0.85, 0.72 - 0.52 * v);
    return rgbToCmyk(r, g, b)[ch];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const x0 = 30, y0 = 30, x1 = w - 30, y1 = h - 56, gw = x1 - x0, gh = y1 - y0;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);

    const plates: Array<'c' | 'm' | 'y' | 'k'> = this.view === 'composite' ? ['y', 'c', 'm', 'k'] : [this.view as 'c'];
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (const ch of plates) {
      clusteredScreen(ctx, x0, y0, x1, y1, CELL, INK[ch].ang, INK[ch].col,
        (x, y) => this.plateCoverage(x, y, x0, y0, gw, gh, ch));
    }
    ctx.restore();

    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, gw, gh);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const label: Record<string, string> = {
      composite: 'composite — four halftone plates overlaid into the full-colour rosette',
      c: 'cyan plate (15°) — carries blues and greens', m: 'magenta plate (75°) — carries reds and purples',
      y: 'yellow plate (90°) — carries greens and oranges', k: 'black plate (45°) — shadows and depth',
    };
    ctx.fillText(label[this.view], w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Separation());
