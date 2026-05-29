import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { labToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const grey = (L: number) => labToCss([L, 0, 0]);

class LightDark {
  private stage: CanvasStage;
  private hi = 85; private lo = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hi = hydrateNumber('hi', 85); this.lo = hydrateNumber('lo', 30);
    for (const k of ['hi', 'lo'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.hi = 85; this.lo = 30; (document.getElementById('hi') as EncSlider).value = 85; (document.getElementById('lo') as EncSlider).value = 30; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const dL = Math.abs(this.hi - this.lo);

    // value ladder (9 steps) on the left
    const steps = 9, lx = 40, ladW = 60, ladH = h - 110, ly = 40;
    for (let i = 0; i < steps; i++) {
      const L = 100 - (i / (steps - 1)) * 100;
      ctx.fillStyle = grey(L); ctx.fillRect(lx, ly + (i / steps) * ladH, ladW, ladH / steps);
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(lx, ly, ladW, ladH);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('L* 100', lx + ladW / 2, ly - 6); ctx.fillText('L* 0', lx + ladW / 2, ly + ladH + 14);
    // markers for hi/lo
    const yAt = (L: number) => ly + (1 - L / 100) * ladH;
    for (const [L, lbl, col] of [[this.hi, 'light', theme.ink], [this.lo, 'dark', theme.crimson]] as const) {
      ctx.strokeStyle = col as string; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx - 6, yAt(L)); ctx.lineTo(lx + ladW + 6, yAt(L)); ctx.stroke();
      ctx.fillStyle = col as string; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${lbl} ${Math.round(L)}`, lx + ladW + 10, yAt(L) + 3);
    }

    // two big fields on the right
    const fx = lx + ladW + 110, fw = w - fx - 30, fh = (h - 130) / 2;
    ctx.fillStyle = grey(this.hi); ctx.fillRect(fx, ly, fw, fh);
    ctx.fillStyle = grey(this.lo); ctx.fillRect(fx, ly + fh + 10, fw, fh);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(fx, ly, fw, fh); ctx.strokeRect(fx, ly + fh + 10, fw, fh);

    ctx.fillStyle = theme.crimson; ctx.font = '700 26px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`ΔL* = ${dL.toFixed(0)}`, fx + fw / 2, h - 40);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(dL < 15 ? 'a narrow gap — flat, low contrast' : dL > 55 ? 'a wide gap — crisp, bold contrast' : 'a moderate value contrast', fx + fw / 2, h - 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new LightDark());
