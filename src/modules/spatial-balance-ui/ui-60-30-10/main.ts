import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const C_DOM = 'rgb(231,236,242)', C_SEC = 'rgb(86,116,158)', C_ACC = 'rgb(232,116,42)';

class Ui603010 {
  private stage: CanvasStage;
  private p1 = 60; private p2 = 30; private p3 = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.p1 = hydrateNumber('p1', 60); this.p2 = hydrateNumber('p2', 30); this.p3 = hydrateNumber('p3', 10);
    for (const k of ['p1', 'p2', 'p3'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.p1 = 60; this.p2 = 30; this.p3 = 10;
      (['p1', 'p2', 'p3'] as const).forEach((k) => ((document.getElementById(k) as EncSlider).value = this[k]));
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const sum = this.p1 + this.p2 + this.p3;
    const d = this.p1 / sum, s = this.p2 / sum, a = this.p3 / sum;

    // mock UI card
    const px = 30, py = 30, pw = w * 0.58, ph = h - 110;
    ctx.fillStyle = C_DOM; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    // secondary panels (cards) — total area ~ s
    const cardArea = s * pw * ph;
    const cardH = Math.min(ph - 80, Math.max(30, cardArea / (pw * 0.42)));
    ctx.fillStyle = C_SEC; ctx.fillRect(px + 16, py + 50, pw * 0.42, cardH);
    ctx.fillRect(px + 16 + pw * 0.46, py + 50, pw * 0.42, cardH);
    // header strip (secondary)
    ctx.fillRect(px, py, pw, 34);
    // accent button — area ~ a
    const accArea = a * pw * ph;
    const accW = Math.min(pw * 0.6, Math.max(40, Math.sqrt(accArea * 2.5)));
    const accH = Math.min(ph * 0.4, accArea / accW);
    ctx.fillStyle = C_ACC; ctx.fillRect(px + pw - accW - 20, py + ph - accH - 20, accW, accH);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
    if (accH > 18) ctx.fillText('Action', px + pw - accW / 2 - 20, py + ph - accH / 2 - 14);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Dashboard', px + 14, py + 22);

    // proportion bar (right)
    const bx = px + pw + 34, bw = w - bx - 30, by = py + 20, bh = 40;
    let xx = bx;
    for (const [frac, col] of [[d, C_DOM], [s, C_SEC], [a, C_ACC]] as const) {
      ctx.fillStyle = col as string; ctx.fillRect(xx, by, frac * bw, bh);
      xx += frac * bw;
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${(d * 100).toFixed(0)} · ${(s * 100).toFixed(0)} · ${(a * 100).toFixed(0)}`, bx, by + bh + 24);

    const near = Math.abs(d - 0.6) < 0.08 && Math.abs(s - 0.3) < 0.08 && Math.abs(a - 0.1) < 0.05;
    ctx.fillStyle = near ? theme.slate : theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    this.wrap(ctx, near ? 'near 60-30-10 — the accent reads as emphasis against a calm ground'
      : a > 0.25 ? 'the accent is too large — it no longer reads as an accent'
      : 'shift toward 60-30-10 for a calm, hierarchical palette', bx, by + bh + 52, bw, 20);
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    const words = text.split(' '); let line = '', yy = y;
    for (const word of words) { if (ctx.measureText(line + word).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = ''; yy += lh; } line += word + ' '; }
    ctx.fillText(line.trim(), x, yy);
  }
}
window.addEventListener('DOMContentLoaded', () => new Ui603010());
