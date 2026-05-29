import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { pqEncode, rgb2020ToICtCp } from '@core/math/hdr-spaces';
import { BT2020 } from '@core/math/rgb-spaces';
import { srgbCss, linearSrgbFromXyz } from '@core/math/color-adaptation';
import { mul3 } from '@core/math/rgb-spaces';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type V3 = [number, number, number];

function hueRgb(h: number): V3 {
  const x = 1 - Math.abs(((h / 60) % 2) - 1);
  const seg = Math.floor(h / 60) % 6;
  return [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][seg] as V3;
}

class IctcpItp {
  private stage: CanvasStage;
  private lum = 200; private hue = 30; private lp = 10000;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lum = hydrateNumber('lum', 200); this.hue = hydrateNumber('hue', 30); this.lp = Number(hydrateFromUrl('lp') ?? 10000);
    for (const k of ['lum', 'hue'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const lpt = document.getElementById('lp') as EncToggle;
    lpt.value = String(this.lp);
    lpt.addEventListener('change', (e) => { this.lp = Number((e as CustomEvent).detail.value); this.draw(); notifyStateChange(); });
    registerStateParam('lp', () => this.lp);
    document.addEventListener('reset-params', () => {
      this.lum = 200; this.hue = 30; this.lp = 10000;
      (document.getElementById('lum') as EncSlider).value = 200;
      (document.getElementById('hue') as EncSlider).value = 30;
      lpt.value = '10000'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // Build a Rec.2020 colour at the chosen luminance (cd/m²) so its I matches the PQ curve.
    const base = hueRgb(this.hue);
    const rgb = base.map((c) => c * this.lum) as V3;
    const itp = rgb2020ToICtCp(rgb, this.lp);
    const I = itp[0], Ct = itp[1], Cp = itp[2], T = Ct / 2;

    // ---- top: PQ curve (log luminance → code) ----
    const x0 = 50, topY = 30, plotW = w - x0 - 36, topH = (h - 110) * 0.5;
    const lx = (L: number) => x0 + (Math.log10(Math.max(L, 0.1)) - Math.log10(0.1)) / (Math.log10(10000) - Math.log10(0.1)) * plotW;
    const ly = (code: number) => topY + topH - code * topH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x0, topY + topH); ctx.lineTo(x0 + plotW, topY + topH); ctx.stroke();
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const L = 0.1 * (10000 / 0.1) ** (i / 200);
      const code = pqEncode(L, this.lp);
      i === 0 ? ctx.moveTo(lx(L), ly(code)) : ctx.lineTo(lx(L), ly(code));
    }
    ctx.stroke();
    // marker at current luminance
    const code = pqEncode(this.lum, this.lp);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(lx(this.lum), topY + topH); ctx.lineTo(lx(this.lum), ly(code)); ctx.lineTo(x0, ly(code)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(lx(this.lum), ly(code), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    for (const L of [0.1, 1, 10, 100, 1000, 10000]) ctx.fillText(String(L), lx(L) - 6, topY + topH + 14);
    ctx.fillText('cd/m²', x0 + plotW - 30, topY + topH + 28);
    ctx.fillText('PQ code', x0 - 44, topY + 8);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`PQ: ${this.lum} cd/m² → code ${code.toFixed(3)} · I = ${I.toFixed(3)}`, x0, topY - 8);

    // ---- bottom: Ct-Cp plane ----
    const cy0 = topY + topH + 44, planeH = h - cy0 - 30;
    const cxc = w * 0.5, cyc = cy0 + planeH * 0.5, R = Math.min(planeH, w * 0.5) * 0.46;
    const SCALE = R / 0.5;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cxc - R, cyc); ctx.lineTo(cxc + R, cyc); ctx.moveTo(cxc, cyc - R); ctx.lineTo(cxc, cyc + R); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Ct (T)', cxc + R - 30, cyc - 6); ctx.fillText('Cp (P)', cxc + 6, cyc - R + 12);
    // reference hue ring (faint)
    ctx.strokeStyle = theme.inkAlpha(0.15);
    for (let hh = 0; hh < 360; hh += 30) {
      const rr = hueRgb(hh).map((c) => c * this.lum) as V3;
      const it = rgb2020ToICtCp(rr, this.lp);
      ctx.beginPath(); ctx.arc(cxc + it[1] * SCALE, cyc - it[2] * SCALE, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.inkAlpha(0.3); ctx.fill();
    }
    // current point
    ctx.beginPath(); ctx.arc(cxc + Ct * SCALE, cyc - Cp * SCALE, 7, 0, Math.PI * 2);
    const disp = srgbCss(linearSrgbFromXyz(mul3(BT2020.toXyz, base)));
    ctx.fillStyle = disp; ctx.fill(); ctx.strokeStyle = theme.ink; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`I ${I.toFixed(3)} · Ct ${Ct.toFixed(3)} · Cp ${Cp.toFixed(3)} · T=Ct/2 ${T.toFixed(3)}`, x0, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new IctcpItp());
