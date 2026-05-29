import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { apcaContrast } from '@core/math/apca';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const grey = (L: number): [number, number, number] => { const v = Math.round(255 * Math.pow(L / 100, 1 / 2.2)); return [v, v, v]; };
const LC_COLS = [90, 75, 60, 45, 30, 15];
const SIZES: Record<string, (number | null)[]> = {
  '400': [14, 18, 24, 32, 36, null],
  '700': [14, 14, 16, 18, 24, null],
};
function lcColumn(lc: number): number { // index into LC_COLS, or -1 if below 15
  const a = Math.abs(lc);
  for (let i = 0; i < LC_COLS.length; i++) if (a >= LC_COLS[i]) return i;
  return -1;
}

class FontMatrix {
  private stage: CanvasStage;
  private txtL = 35; private bgL = 97; private wt = '400';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.txtL = hydrateNumber('txtL', 35); this.bgL = hydrateNumber('bgL', 97); this.wt = hydrateFromUrl('wt') ?? '400';
    for (const k of ['txtL', 'bgL'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const t = document.getElementById('wt') as EncToggle;
    t.value = this.wt;
    t.addEventListener('change', (e) => { this.wt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('wt', () => this.wt);
    document.addEventListener('reset-params', () => {
      this.txtL = 35; this.bgL = 97; this.wt = '400';
      (document.getElementById('txtL') as EncSlider).value = 35; (document.getElementById('bgL') as EncSlider).value = 97; t.value = '400'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const lc = apcaContrast(grey(this.txtL), grey(this.bgL));
    const col = lcColumn(lc);
    const rows = ['400', '700'];
    const selRow = rows.indexOf(this.wt);

    // grid
    const x0 = 110, y0 = 90, cw = (w - x0 - 30) / LC_COLS.length, rh = 64;
    ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = theme.inkMute;
    ctx.fillText('contrast Lc →', x0 + cw * LC_COLS.length / 2, y0 - 30);
    LC_COLS.forEach((lcv, i) => ctx.fillText(`Lc ${lcv}+`, x0 + i * cw + cw / 2, y0 - 8));
    rows.forEach((wt, r) => {
      ctx.textAlign = 'right'; ctx.fillStyle = theme.inkMute; ctx.fillText(`${wt} wt`, x0 - 10, y0 + r * rh + rh / 2 + 4);
      SIZES[wt].forEach((sz, c) => {
        const cx = x0 + c * cw, cy = y0 + r * rh;
        const hit = c === col && r === selRow;
        ctx.fillStyle = sz === null ? theme.inkAlpha(0.06) : (hit ? theme.crimsonAlpha(0.18) : theme.paper);
        ctx.fillRect(cx, cy, cw - 3, rh - 3);
        ctx.strokeStyle = hit ? theme.crimson : axisStyle.baseline; ctx.lineWidth = hit ? 2.5 : 1; ctx.strokeRect(cx, cy, cw - 3, rh - 3);
        ctx.fillStyle = sz === null ? theme.inkHint : theme.inkSoft; ctx.font = '600 16px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(sz === null ? '—' : `${sz}px`, cx + cw / 2, cy + rh / 2 + 5);
      });
    });

    // preview swatch + verdict
    const lcv = col >= 0 ? SIZES[this.wt][col] : null;
    ctx.fillStyle = theme.crimson; ctx.font = '700 26px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`Lc ${Math.abs(lc).toFixed(0)} · ${this.wt} wt`, x0, y0 + 2 * rh + 44);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(col < 0 ? 'below Bronze — this pair should not carry body text'
      : lcv === null ? 'this weight needs more contrast at any usable size'
      : `minimum size: ${lcv}px at weight ${this.wt}`, x0, y0 + 2 * rh + 68);
  }
}
window.addEventListener('DOMContentLoaded', () => new FontMatrix());
