import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { deltaE76, deltaE2000, labToCss, type Lab } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const REF: Lab = [55, 38, 18]; // fixed reference (mid-chroma warm)

class JndCiede2000 {
  private stage: CanvasStage;
  private dl = 0; private da = 12; private db = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dl = hydrateNumber('dl', 0); this.da = hydrateNumber('da', 12); this.db = hydrateNumber('db', 0);
    for (const id of ['dl', 'da', 'db'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.dl = 0; this.da = 12; this.db = 0;
      (document.getElementById('dl') as EncSlider).value = 0;
      (document.getElementById('da') as EncSlider).value = 12;
      (document.getElementById('db') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const test: Lab = [REF[0] + this.dl, REF[1] + this.da, REF[2] + this.db];
    const e76 = deltaE76(REF, test);
    const e00 = deltaE2000(REF, test);

    // Two swatches.
    const sw = w * 0.26, sh = h * 0.4, sy = 64;
    const refX = w * 0.16, testX = w * 0.58;
    ctx.fillStyle = labToCss(REF); ctx.fillRect(refX, sy, sw, sh);
    ctx.fillStyle = labToCss(test); ctx.fillRect(testX, sy, sw, sh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(refX, sy, sw, sh); ctx.strokeRect(testX, sy, sw, sh);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`reference  L*${REF[0]} a*${REF[1]} b*${REF[2]}`, refX + sw / 2, sy - 10);
    ctx.fillText(`test  L*${test[0].toFixed(0)} a*${test[1].toFixed(0)} b*${test[2].toFixed(0)}`, testX + sw / 2, sy - 10);
    ctx.textAlign = 'left';

    // ΔE bars.
    const by = sy + sh + 56, bx = w * 0.16, bw = w * 0.68, maxE = 60;
    const bar = (y: number, val: number, label: string, color: string) => {
      ctx.fillStyle = theme.paperRecess; ctx.fillRect(bx, y, bw, 20);
      ctx.fillStyle = color; ctx.fillRect(bx, y, Math.min(1, val / maxE) * bw, 20);
      ctx.strokeStyle = theme.inkAlpha(0.35); ctx.lineWidth = 1; ctx.strokeRect(bx, y, bw, 20);
      ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`${label}  ${val.toFixed(2)}`, bx, y - 6);
    };
    bar(by, e76, 'ΔE*ab (CIE76)', theme.slate);
    bar(by + 54, e00, 'ΔE00 (CIEDE2000)', theme.crimson);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    const ratio = e76 > 0.01 ? (e00 / e76) : 1;
    ctx.fillText(`ΔE2000 is ${(ratio * 100).toFixed(0)}% of the plain ΔE76 distance`, bx, by + 96);
  }
}
window.addEventListener('DOMContentLoaded', () => new JndCiede2000());
