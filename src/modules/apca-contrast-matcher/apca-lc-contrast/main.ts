import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { apcaContrast } from '@core/math/apca';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type RGB = [number, number, number];
function hslRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

function verdict(lc: number): string {
  const a = Math.abs(lc);
  if (a >= 90) return 'Lc 90+ — any text, including thin and small';
  if (a >= 75) return 'Lc 75+ — body text ≥ 18px/400 or 14px/700';
  if (a >= 60) return 'Lc 60+ — body text ≥ 24px/400 or 16px/700';
  if (a >= 45) return 'Lc 45+ — large/heading text only';
  if (a >= 30) return 'Lc 30+ — non-text & large only, not body';
  if (a >= 15) return 'Lc 15+ — barely; placeholders, disabled';
  return 'Lc < 15 — effectively invisible as text';
}

class ApcaLc {
  private stage: CanvasStage;
  private txtL = 48; private txtH = 220; private bgL = 96;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.txtL = hydrateNumber('txtL', 48); this.txtH = hydrateNumber('txtH', 220); this.bgL = hydrateNumber('bgL', 96);
    for (const k of ['txtL', 'txtH', 'bgL'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.txtL = 48; this.txtH = 220; this.bgL = 96;
      (['txtL', 'txtH', 'bgL'] as const).forEach((k) => ((document.getElementById(k) as EncSlider).value = this[k]));
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const txt = hslRgb(this.txtH, 0.55, this.txtL / 100);
    const bg = hslRgb(0, 0, this.bgL / 100);
    const lc = apcaContrast(txt, bg);

    // preview panel (left)
    const px = 24, py = 24, pw = w * 0.52, ph = h - 90;
    ctx.fillStyle = css(bg); ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = css(txt);
    ctx.font = '700 30px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Heading 30px', px + 20, py + 50);
    ctx.font = '400 18px Inter, sans-serif'; ctx.fillText('Body text at 18 pixels, weight 400.', px + 20, py + 90);
    ctx.font = '400 14px Inter, sans-serif'; ctx.fillText('Caption at 14 pixels — the hardest to read.', px + 20, py + 120);
    ctx.font = '700 14px Inter, sans-serif'; ctx.fillText('Bold caption 14px / 700.', px + 20, py + 146);

    // meter (right)
    const mx = px + pw + 36, mw = w - mx - 30;
    ctx.fillStyle = lc >= 0 ? theme.crimson : theme.slate;
    ctx.font = '700 44px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`Lc ${lc.toFixed(1)}`, mx, py + 50);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(lc >= 0 ? 'dark text on light (BoW)' : 'light text on dark (WoB)', mx, py + 70);

    // |Lc| bar 0..108
    const by = py + 100, bw = mw, bh = 22;
    ctx.fillStyle = theme.goldAlpha(0.2); ctx.fillRect(mx, by, bw, bh);
    ctx.fillStyle = theme.slate; ctx.fillRect(mx, by, Math.min(1, Math.abs(lc) / 108) * bw, bh);
    for (const thr of [30, 45, 60, 75, 90]) {
      const tx = mx + (thr / 108) * bw;
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, by); ctx.lineTo(tx, by + bh); ctx.stroke();
      ctx.fillStyle = theme.inkHint; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(thr), tx, by + bh + 12);
    }
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    this.wrap(ctx, verdict(lc), mx, by + 56, mw, 20);
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    const words = text.split(' '); let line = '', yy = y;
    for (const word of words) {
      if (ctx.measureText(line + word).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = ''; yy += lh; }
      line += word + ' ';
    }
    ctx.fillText(line.trim(), x, yy);
  }
}
window.addEventListener('DOMContentLoaded', () => new ApcaLc());
