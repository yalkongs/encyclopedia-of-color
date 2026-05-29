import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToCss, deltaECMC } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const REF: Lab = [55, 35, 18];
const DEG = Math.PI / 180;

// CMC weighting factors for the reference colour (drives the ellipse geometry).
function cmcFactors(L1: number, a1: number, b1: number) {
  const C1 = Math.hypot(a1, b1);
  let H1 = Math.atan2(b1, a1) / DEG; if (H1 < 0) H1 += 360;
  const T = H1 >= 164 && H1 <= 345
    ? 0.56 + Math.abs(0.2 * Math.cos((H1 + 168) * DEG))
    : 0.36 + Math.abs(0.4 * Math.cos((H1 + 35) * DEG));
  const C1_4 = C1 ** 4;
  const F = Math.sqrt(C1_4 / (C1_4 + 1900));
  const SL = L1 < 16 ? 0.511 : (0.040975 * L1) / (1 + 0.01765 * L1);
  const SC = (0.0638 * C1) / (1 + 0.0131 * C1) + 0.638;
  const SH = SC * (F * T + 1 - F);
  return { C1, hue: Math.atan2(b1, a1), SL, SC, SH };
}

class CmcMod {
  private stage: CanvasStage;
  private dL = 4; private da = 6; private db = 9; private l = 2;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dL = hydrateNumber('dL', 4); this.da = hydrateNumber('da', 6); this.db = hydrateNumber('db', 9);
    this.l = Number(hydrateFromUrl('lc') ?? 2);
    for (const k of ['dL', 'da', 'db'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const lc = document.getElementById('lc') as EncToggle;
    lc.value = String(this.l);
    lc.addEventListener('change', (e) => { this.l = Number((e as CustomEvent).detail.value); this.draw(); notifyStateChange(); });
    registerStateParam('lc', () => this.l);
    document.addEventListener('reset-params', () => {
      this.dL = 4; this.da = 6; this.db = 9; this.l = 2;
      (document.getElementById('dL') as EncSlider).value = 4;
      (document.getElementById('da') as EncSlider).value = 6;
      (document.getElementById('db') as EncSlider).value = 9;
      lc.value = '2'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const sample: Lab = [REF[0] + this.dL, REF[1] + this.da, REF[2] + this.db];
    const dE = deltaECMC(REF, sample, this.l, 1);
    const inside = dE <= 1;
    const f = cmcFactors(REF[0], REF[1], REF[2]);

    // a*b* plot window
    const aMin = -8, aMax = 78, bMin = -24, bMax = 58;
    const x0 = 24, plotY = 24, lbarW = 70;
    const plotW = w - x0 - lbarW - 60, plotH = h - plotY - 36;
    const sc = Math.min(plotW / (aMax - aMin), plotH / (bMax - bMin));
    const px = (a: number) => x0 + (a - aMin) * sc;
    const py = (b: number) => plotY + plotH - (b - bMin) * sc;

    // axes
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(aMin), py(0)); ctx.lineTo(px(aMax), py(0)); ctx.moveTo(px(0), py(bMin)); ctx.lineTo(px(0), py(bMax)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('a*', px(aMax) - 16, py(0) - 6); ctx.fillText('b*', px(0) + 6, py(bMax) + 12);
    // radius from origin to reference (chroma direction)
    ctx.strokeStyle = theme.goldAlpha(0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(REF[1]), py(REF[2])); ctx.stroke(); ctx.setLineDash([]);

    // tolerance ellipse (ΔL=0 boundary): radial axis = c·SC = SC, tangential = SH
    const ur: [number, number] = [Math.cos(f.hue), Math.sin(f.hue)];
    const ut: [number, number] = [-Math.sin(f.hue), Math.cos(f.hue)];
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      const r = f.SC * Math.cos(t), tg = f.SH * Math.sin(t);
      const a = REF[1] + r * ur[0] + tg * ut[0];
      const b = REF[2] + r * ur[1] + tg * ut[1];
      i === 0 ? ctx.moveTo(px(a), py(b)) : ctx.lineTo(px(a), py(b));
    }
    ctx.closePath();
    ctx.fillStyle = theme.crimsonAlpha(0.08); ctx.fill();
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.6; ctx.stroke();

    // reference + sample points
    const dot = (lab: Lab, ring: string) => {
      ctx.beginPath(); ctx.arc(px(lab[1]), py(lab[2]), 7, 0, Math.PI * 2);
      ctx.fillStyle = labToCss(lab); ctx.fill();
      ctx.strokeStyle = ring; ctx.lineWidth = 2; ctx.stroke();
    };
    dot(REF, theme.ink);
    dot(sample, inside ? theme.slate : theme.crimson);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('ref', px(REF[1]) + 9, py(REF[2]) - 7);
    ctx.fillText('sample', px(sample[1]) + 9, py(sample[2]) - 7);

    // lightness band (right): half-height = l·SL
    const bx = x0 + plotW + 44, bcy = plotY + plotH * 0.5, bandH = Math.min(plotH * 0.8, 220);
    const lTol = this.l * f.SL;
    const lScale = (bandH * 0.5) / Math.max(lTol * 1.6, Math.abs(this.dL) * 1.2, 8);
    ctx.fillStyle = theme.goldAlpha(0.18); ctx.fillRect(bx - 14, bcy - lTol * lScale, 28, 2 * lTol * lScale);
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 1.4; ctx.strokeRect(bx - 14, bcy - lTol * lScale, 28, 2 * lTol * lScale);
    ctx.strokeStyle = axisStyle.baseline; ctx.beginPath(); ctx.moveTo(bx - 20, bcy); ctx.lineTo(bx + 20, bcy); ctx.stroke();
    const my = bcy - this.dL * lScale;
    ctx.fillStyle = Math.abs(this.dL) <= lTol ? theme.slate : theme.crimson;
    ctx.beginPath(); ctx.arc(bx, my, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ΔL* band', bx, plotY + plotH + 2);
    ctx.fillText(`±${lTol.toFixed(1)}`, bx, bcy - lTol * lScale - 6);
    ctx.textAlign = 'left';

    // verdict
    ctx.fillStyle = inside ? theme.slate : theme.crimson;
    ctx.font = '700 22px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ΔE_CMC(${this.l}:1) = ${dE.toFixed(2)}  ${inside ? '✓ pass' : '✕ fail'}`, x0, plotY + plotH + 24);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ellipse stretched ${(f.SC / f.SH).toFixed(2)}× along chroma · l:c only resizes the ΔL* band`, x0 + 250, plotY + plotH + 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new CmcMod());
