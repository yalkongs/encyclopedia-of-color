import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { CMF_1964_10DEG } from '@core/math/cmf-10deg';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 380, LMAX = 780, YMAX = 2.0;
const CH: Array<{ key: 'xBar' | 'yBar' | 'zBar'; label: string; color: string }> = [
  { key: 'xBar', label: 'x̄', color: '#c0392b' },
  { key: 'yBar', label: 'ȳ', color: '#2f8f4e' },
  { key: 'zBar', label: 'z̄', color: '#2b6cb0' },
];

class Cmf2v10 {
  private stage: CanvasStage;
  private lambda = 450;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 450);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('lambda', () => this.lambda);
    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.lambda = 450;
      (document.getElementById('lambda') as EncSlider).value = 450;
      this.draw(); notifyStateChange();
    });
  }

  private at(rows: typeof CMF_1931_2DEG, lam: number, key: 'xBar' | 'yBar' | 'zBar'): number {
    const r = rows.find((x) => x.lambda === lam);
    return r ? r[key] : 0;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 44, padR = 24, padT = 36, padB = 60;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (v: number) => plotY + (1 - v / YMAX) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 780; l += 50) ctx.fillText(String(l), xOf(l), plotY + plotH + 16);
    ctx.fillText('wavelength (nm)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.textAlign = 'left';

    const curve = (rows: typeof CMF_1931_2DEG, key: 'xBar' | 'yBar' | 'zBar', color: string, dashed: boolean) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath();
      rows.forEach((r, i) => { const X = xOf(r.lambda), Y = yOf(r[key]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    for (const c of CH) { curve(CMF_1931_2DEG, c.key, c.color, false); curve(CMF_1964_10DEG, c.key, c.color, true); }

    // Wavelength marker + readout.
    const mx = xOf(this.lambda);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, plotY); ctx.lineTo(mx, plotY + plotH); ctx.stroke(); ctx.setLineDash([]);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute; ctx.fillText('solid 2° · dashed 10°', plotX + plotW - 120, plotY + 10);
    let ty = plotY + 12;
    for (const c of CH) {
      const v2 = this.at(CMF_1931_2DEG, this.lambda, c.key), v10 = this.at(CMF_1964_10DEG, this.lambda, c.key);
      ctx.fillStyle = c.color;
      ctx.fillText(`${c.label}  2° ${v2.toFixed(3)}   10° ${v10.toFixed(3)}`, plotX + 8, ty); ty += 15;
    }
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`λ = ${this.lambda} nm`, plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Cmf2v10());
