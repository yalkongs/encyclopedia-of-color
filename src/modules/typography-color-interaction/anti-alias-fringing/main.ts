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

const COLS = 16, ROWS = 9; // pixel grid

class Fringing {
  private stage: CanvasStage;
  private pos = 50; private mode = 'subpixel';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pos = hydrateNumber('pos', 50); this.mode = hydrateFromUrl('mode') ?? 'subpixel';
    const s = document.getElementById('pos') as EncSlider;
    s.value = this.pos;
    s.addEventListener('input', (e) => { this.pos = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pos', () => Math.round(this.pos));
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.pos = 50; this.mode = 'subpixel'; s.value = 50; t.value = 'subpixel'; this.draw(); notifyStateChange(); });
  }

  // coverage of a black stem [a,b] over the subpixel span [x0,x1], in pixel units
  private cover(x0: number, x1: number, a: number, b: number): number {
    const lo = Math.max(x0, a), hi = Math.min(x1, b);
    return Math.max(0, hi - lo) / (x1 - x0);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 40, gy = 40, gw = w - 200, gh = h - 110, pw = gw / COLS, ph = gh / ROWS;
    // a black stem with fractional left/right edges so both fringes appear
    const a = 5.4 + (this.pos / 100) * 4, b = a + 3.3;
    const sub = this.mode === 'subpixel';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x0 = c, x1 = c + 1;
        let R: number, G: number, B: number;
        if (sub) {
          R = 1 - this.cover(x0, x0 + 1 / 3, a, b);
          G = 1 - this.cover(x0 + 1 / 3, x0 + 2 / 3, a, b);
          B = 1 - this.cover(x0 + 2 / 3, x1, a, b);
        } else {
          const v = 1 - this.cover(x0, x1, a, b); R = G = B = v;
        }
        ctx.fillStyle = `rgb(${Math.round(R * 255)},${Math.round(G * 255)},${Math.round(B * 255)})`;
        ctx.fillRect(gx + c * pw, gy + r * ph, pw + 0.5, ph + 0.5);
      }
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);

    // legend: actual-size preview of a stem
    const px = gx + gw + 26;
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(sub ? 'subpixel (ClearType)' : 'greyscale AA', px, gy + 16);
    ctx.fillText('R · G · B stripes', px, gy + 34);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(sub
      ? 'crisper, but the moving edge shimmers red on one side, blue on the other'
      : 'neutral edges, but softer — no colour, lower effective resolution', gx + gw / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Fringing());
