import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToCss, deltaE76 } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const REF: Lab = [55, 25, 15];

class DeltaE76 {
  private stage: CanvasStage;
  private L = 60; private a = 35; private b = 22;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 60); this.a = hydrateNumber('a', 35); this.b = hydrateNumber('b', 22);
    for (const k of ['L', 'a', 'b'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.L = 60; this.a = 35; this.b = 22;
      (document.getElementById('L') as EncSlider).value = 60;
      (document.getElementById('a') as EncSlider).value = 35;
      (document.getElementById('b') as EncSlider).value = 22;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const sample: Lab = [this.L, this.a, this.b];
    const dE = deltaE76(REF, sample);

    // patches
    const pw = 78, ph = 56, py = 26;
    ctx.fillStyle = labToCss(REF); ctx.fillRect(24, py, pw, ph);
    ctx.fillStyle = labToCss(sample); ctx.fillRect(24 + pw + 14, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.strokeRect(24, py, pw, ph); ctx.strokeRect(24 + pw + 14, py, pw, ph);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('reference', 24, py + ph + 14); ctx.fillText('sample', 24 + pw + 14, py + ph + 14);

    // ΔE readout
    const verdict = dE < 1 ? 'below the just-noticeable threshold' : dE < 2.3 ? 'just noticeable' : dE < 5 ? 'clearly distinct' : 'far apart';
    ctx.fillStyle = theme.crimson; ctx.font = '700 30px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ΔE₇₆ = ${dE.toFixed(2)}`, 24 + 2 * pw + 40, py + 26);
    ctx.fillStyle = theme.inkSoft; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(verdict, 24 + 2 * pw + 40, py + 46);

    // a*b* plot
    const M = 90, plotY = py + ph + 34;
    const plotH = h - plotY - 18, plotW = Math.min(plotH, w - 48);
    const x0 = 24, y0 = plotY;
    const px = (a: number) => x0 + ((a + M) / (2 * M)) * plotW;
    const py2 = (b: number) => y0 + (1 - (b + M) / (2 * M)) * plotH;
    // axes
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let g = -M; g <= M; g += 30) {
      ctx.beginPath(); ctx.moveTo(px(g), y0); ctx.lineTo(px(g), y0 + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, py2(g)); ctx.lineTo(x0 + plotW, py2(g)); ctx.stroke();
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px(0), y0); ctx.lineTo(px(0), y0 + plotH); ctx.moveTo(x0, py2(0)); ctx.lineTo(x0 + plotW, py2(0)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('+a*', px(M) - 22, py2(0) - 6); ctx.fillText('+b*', px(0) + 6, py2(M) + 12);

    // connecting line = ΔE distance (projected onto a*b*)
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px(REF[1]), py2(REF[2])); ctx.lineTo(px(this.a), py2(this.b)); ctx.stroke();
    // points
    const dot = (lab: Lab, label: string) => {
      ctx.beginPath(); ctx.arc(px(lab[1]), py2(lab[2]), 7, 0, Math.PI * 2);
      ctx.fillStyle = labToCss(lab); ctx.fill();
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(label, px(lab[1]) + 9, py2(lab[2]) - 6);
    };
    dot(REF, 'ref'); dot(sample, 'sample');
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('a*b* plane — line length is the Euclidean ΔE (ΔL* adds out of plane)', x0, y0 + plotH + 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new DeltaE76());
