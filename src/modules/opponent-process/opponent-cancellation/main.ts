import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TEST_RG = 0.6, TEST_YB = 0.55; // orange test patch

function opponentCss(rg: number, yb: number): string {
  const base = 0.62;
  const r = base + 0.30 * rg + 0.10 * yb;
  const g = base - 0.30 * rg + 0.10 * yb;
  const b = base - 0.42 * yb;
  const ch = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

class HueCancellation {
  private stage: CanvasStage;
  private rg = 0;
  private yb = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.rg = hydrateNumber('rg', 0);
    this.yb = hydrateNumber('yb', 0);
    for (const id of ['rg', 'yb'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.rg = 0; this.yb = 0;
      (document.getElementById('rg') as EncSlider).value = 0;
      (document.getElementById('yb') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const rgF = TEST_RG + this.rg / 100;
    const ybF = TEST_YB + this.yb / 100;

    // Patch.
    const px = w * 0.12, py = 64, pw = w * 0.42, ph = h * 0.56;
    ctx.fillStyle = opponentCss(rgF, ybF);
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('test patch', px, py - 10);

    // Residual meters.
    const mx = w * 0.62, mw = w * 0.30, baseY = h * 0.34, gap = h * 0.18;
    const meter = (y: number, val: number, posLabel: string, negLabel: string) => {
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mx + mw / 2, y - 22); ctx.lineTo(mx + mw / 2, y + 22); ctx.stroke();
      ctx.fillStyle = Math.abs(val) < 0.05 ? theme.goldDeep : theme.crimson;
      const bw = (val / 1.6) * (mw / 2);
      ctx.fillRect(mx + mw / 2, y - 12, bw, 24);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.fillText(posLabel, mx + mw + 6, y + 4);
      ctx.textAlign = 'right'; ctx.fillText(negLabel, mx - 6, y + 4);
      ctx.textAlign = 'left';
    };
    meter(baseY, rgF, 'red', 'green');
    meter(baseY + gap, ybF, 'yellow', 'blue');
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('residual opponent signals', mx, baseY - 36);

    const done = Math.abs(rgF) < 0.05 && Math.abs(ybF) < 0.05;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(done ? 'both channels nulled — the patch is neutral grey' : 'cancel red with green, yellow with blue', px, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new HueCancellation());
