import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { cividis, jet, type RGB } from '@core/math/colormaps';
import { simulateBrettel, type CVDType } from '@core/math/cvd';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class CividisCvd {
  private stage: CanvasStage;
  private cvd = 'deuteranopia';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cvd = hydrateFromUrl('cvd') ?? 'deuteranopia';
    const t = document.getElementById('cvd') as EncToggle;
    t.value = this.cvd;
    t.addEventListener('change', (e) => { this.cvd = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cvd', () => this.cvd);
    document.addEventListener('reset-params', () => { this.cvd = 'deuteranopia'; t.value = 'deuteranopia'; this.draw(); notifyStateChange(); });
  }

  private ramp(ctx: CanvasRenderingContext2D, fn: (t: number) => RGB, sim: boolean, x: number, y: number, w: number, hh: number, label: string) {
    for (let i = 0; i < w; i++) {
      let c = fn(i / (w - 1));
      if (sim) { const o = simulateBrettel({ r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 }, this.cvd as CVDType); c = [o.r * 255, o.g * 255, o.b * 255]; }
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctx.fillRect(x + i, y, 1, hh);
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, hh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 6);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const x = 30, pw = w - 60, ph = 64, gap = 54;
    this.ramp(ctx, cividis, false, x, 44, pw, ph, 'cividis — as designed');
    this.ramp(ctx, cividis, true, x, 44 + ph + gap, pw, ph, `cividis — as a ${this.cvd.replace('anopia','')} viewer sees it (still ordered)`);
    this.ramp(ctx, jet, true, x, 44 + 2 * (ph + gap), pw, ph, `jet — same simulation (order collapses)`);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('cividis avoids the red-green axis, so its blue→yellow order is preserved for everyone', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new CividisCvd());
