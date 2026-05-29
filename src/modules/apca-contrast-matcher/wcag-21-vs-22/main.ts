import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { apcaContrast, wcagRatio } from '@core/math/apca';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const grey = (L: number): [number, number, number] => { const v = Math.round(255 * Math.pow(L / 100, 1 / 2.2)); return [v, v, v]; };
const css = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

class WcagVsApca {
  private stage: CanvasStage;
  private aL = 40; private bL = 92; private swap = 'ab';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.aL = hydrateNumber('aL', 40); this.bL = hydrateNumber('bL', 92); this.swap = hydrateFromUrl('swap') ?? 'ab';
    for (const k of ['aL', 'bL'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const t = document.getElementById('swap') as EncToggle;
    t.value = this.swap;
    t.addEventListener('change', (e) => { this.swap = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('swap', () => this.swap);
    document.addEventListener('reset-params', () => {
      this.aL = 40; this.bL = 92; this.swap = 'ab';
      (document.getElementById('aL') as EncSlider).value = 40; (document.getElementById('bL') as EncSlider).value = 92; t.value = 'ab'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const A = grey(this.aL), B = grey(this.bL);
    const txt = this.swap === 'ab' ? A : B, bg = this.swap === 'ab' ? B : A;
    const ratio = wcagRatio(A, B);
    const lc = apcaContrast(txt, bg);

    // preview
    const px = 24, py = 24, pw = w * 0.4, ph = h - 90;
    ctx.fillStyle = css(bg); ctx.fillRect(px, py, pw, ph); ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = css(txt); ctx.font = '700 26px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Sample text', px + 18, py + 52);
    ctx.font = '400 16px Inter, sans-serif'; ctx.fillText('text on background', px + 18, py + 84);

    // two readouts
    const mx = px + pw + 40;
    ctx.fillStyle = theme.slate; ctx.font = '700 34px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`WCAG ${ratio.toFixed(2)}:1`, mx, py + 44);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(ratio >= 4.5 ? 'passes 4.5:1 (normal text)' : ratio >= 3 ? 'passes 3:1 (large only)' : 'fails', mx, py + 64);
    ctx.fillText('symmetric — same if you swap roles', mx, py + 80);

    ctx.fillStyle = lc >= 0 ? theme.crimson : theme.goldDeep; ctx.font = '700 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`APCA Lc ${lc.toFixed(1)}`, mx, py + 130);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(lc >= 0 ? 'dark-on-light polarity' : 'light-on-dark polarity', mx, py + 150);
    ctx.fillText('signed — flips when you swap roles', mx, py + 166);

    // 2.1 vs 2.2 note
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('WCAG 2.1 → 2.2:', mx, py + 210);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('· text-contrast ratio unchanged (still 4.5:1 / 3:1)', mx, py + 230);
    ctx.fillText('· 2.2 added focus-appearance criteria, not contrast maths', mx, py + 248);
    ctx.fillText('· APCA Lc is the change WCAG 3 proposes', mx, py + 266);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText('swap the roles: WCAG holds, APCA flips — that asymmetry is the point', mx, h - 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new WcagVsApca());
