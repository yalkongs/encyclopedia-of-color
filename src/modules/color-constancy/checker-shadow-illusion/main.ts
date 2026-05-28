import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const COLS = 6, ROWS = 6;
const LIGHT = 0.62, DARK = 0.32, SHADOW = 0.516; // DARK*1 == LIGHT*SHADOW
const SHADOW_FROM = 4;       // columns >= this are in shadow
const A_CELL = [3, 2];       // dark tile, lit
const B_CELL = [3, 5];       // light tile, shadowed

class CheckerShadow {
  private stage: CanvasStage;
  private connect: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.connect = (hydrateFromUrl('connect') as 'off' | 'on') ?? 'off';
    (document.getElementById('connect') as EncToggle).value = this.connect;
    registerStateParam('connect', () => this.connect);
    (document.getElementById('connect') as EncToggle).addEventListener('change', (e) => {
      this.connect = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.connect = 'off';
      (document.getElementById('connect') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const g = (v: number) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };

    const cell = Math.min((w - 80) / COLS, (h - 120) / ROWS);
    const bx = (w - cell * COLS) / 2, by = 56;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const base = (r + c) % 2 === 0 ? LIGHT : DARK;
        const illum = c >= SHADOW_FROM ? SHADOW : 1;
        ctx.fillStyle = g(base * illum);
        ctx.fillRect(bx + c * cell, by + r * cell, cell, cell);
      }
    }

    // Green cylinder casting the shadow (cosmetic).
    const cylX = bx + (SHADOW_FROM + 1.0) * cell;
    ctx.fillStyle = 'rgba(96,150,90,0.92)';
    ctx.beginPath();
    ctx.ellipse(cylX, by - 6, cell * 0.9, cell * 0.28, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillRect(cylX - cell * 0.9, by - 40, cell * 1.8, 36);
    // Soft penumbra at the shadow's leading edge.
    const edgeX = bx + SHADOW_FROM * cell;
    const grad = ctx.createLinearGradient(edgeX - cell * 0.4, 0, edgeX + cell * 0.2, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad; ctx.fillRect(edgeX - cell * 0.4, by, cell * 0.6, ROWS * cell);

    // Connecting bar across A→B at the shared luminance.
    const ay = by + A_CELL[0] * cell + cell / 2;
    const ax = bx + A_CELL[1] * cell + cell / 2;
    const bxc = bx + B_CELL[1] * cell + cell / 2;
    if (this.connect === 'on') {
      ctx.fillStyle = g(DARK);
      ctx.fillRect(ax, ay - cell * 0.22, bxc - ax, cell * 0.44);
    }

    // A / B markers.
    const mark = (cx: number, label: string) => {
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
      ctx.strokeRect(cx - cell / 2 + 2, ay - cell / 2 + 2, cell - 4, cell - 4);
      ctx.fillStyle = theme.crimson; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, cx, by + ROWS * cell + 20);
    };
    mark(ax, 'A (lit)'); mark(bxc, 'B (shadow)');
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(this.connect === 'on' ? 'A and B are the same grey — the bridge proves it' : 'A looks dark, B looks light — but their luminance is equal', bx, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new CheckerShadow());
