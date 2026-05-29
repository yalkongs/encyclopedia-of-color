import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToXyz, labToCss, xyzToLab, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz, xyzFromLinearSrgb } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const DEG = Math.PI / 180;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function inG(L: number, a: number, b: number) { return srgbInGamut(linearSrgbFromXyz(labToXyz([L, a, b] as Lab))); }
function boundaryChroma(L: number, hue: number): number {
  const ca = Math.cos(hue * DEG), cb = Math.sin(hue * DEG);
  let lo = 0, hi = 160;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (inG(L, m * ca, m * cb)) lo = m; else hi = m; }
  return lo;
}

class LchClip {
  private stage: CanvasStage;
  private L = 55; private hue = 265; private C = 115;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 55); this.hue = hydrateNumber('hue', 265); this.C = hydrateNumber('C', 115);
    for (const k of ['L', 'hue', 'C'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.L = 55; this.hue = 265; this.C = 115;
      (document.getElementById('L') as EncSlider).value = 55;
      (document.getElementById('hue') as EncSlider).value = 265;
      (document.getElementById('C') as EncSlider).value = 115;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const ca = Math.cos(this.hue * DEG), cb = Math.sin(this.hue * DEG);
    const src: Lab = [this.L, this.C * ca, this.C * cb];

    // LCh clip: keep L, hue; chroma → boundary
    const Cb = boundaryChroma(this.L, this.hue);
    const lch: Lab = [this.L, Math.min(this.C, Cb) * ca, Math.min(this.C, Cb) * cb];
    // RGB clamp: clamp linear channels, read back the drifted Lab
    const clampLin = linearSrgbFromXyz(labToXyz(src)).map(clamp01) as [number, number, number];
    const clampLab = xyzToLab(xyzFromLinearSrgb(clampLin));
    const clampHue = (Math.atan2(clampLab[2], clampLab[1]) / DEG + 360) % 360;
    const clampC = Math.hypot(clampLab[1], clampLab[2]);

    // L*-C plane at this hue
    const x0 = 40, plotY = 24, plotW = Math.min(h - 90, w - 320), plotH = plotW;
    const Cmax = 150;
    const mx = (C: number) => x0 + (C / Cmax) * plotW;
    const my = (L: number) => plotY + plotH - (L / 100) * plotH;
    // gamut boundary curve C_b(L)
    ctx.fillStyle = theme.inkAlpha(0.04);
    ctx.beginPath(); ctx.moveTo(mx(0), my(0));
    for (let L = 0; L <= 100; L += 2) ctx.lineTo(mx(boundaryChroma(L, this.hue)), my(L));
    ctx.lineTo(mx(0), my(100)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4; ctx.beginPath();
    for (let L = 0; L <= 100; L += 2) { const X = mx(boundaryChroma(L, this.hue)), Y = my(L); L === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx(0), my(0)); ctx.lineTo(mx(0), my(100)); ctx.lineTo(mx(Cmax), my(100)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('C* →', mx(Cmax) - 30, my(0) + 2); ctx.save(); ctx.translate(x0 - 16, my(50)); ctx.rotate(-Math.PI / 2); ctx.fillText('L*', 0, 0); ctx.restore();

    // connectors
    ctx.strokeStyle = theme.crimsonAlpha(0.5); ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx(this.C), my(this.L)); ctx.lineTo(mx(Math.min(this.C, Cb)), my(this.L)); ctx.stroke();
    ctx.strokeStyle = theme.slateAlpha(0.5);
    ctx.beginPath(); ctx.moveTo(mx(this.C), my(this.L)); ctx.lineTo(mx(clampC), my(clampLab[0])); ctx.stroke(); ctx.setLineDash([]);

    const dot = (C: number, L: number, lab: Lab, color: string, label: string) => {
      ctx.beginPath(); ctx.arc(mx(C), my(L), 6, 0, Math.PI * 2);
      ctx.fillStyle = inG(lab[0], lab[1], lab[2]) ? labToCss(lab) : theme.inkAlpha(0.15); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = color; ctx.font = '600 10px Inter, sans-serif'; ctx.fillText(label, mx(C) + 8, my(L) - 5);
    };
    dot(this.C, this.L, src, theme.ink, 'source');
    dot(Math.min(this.C, Cb), this.L, lch, theme.crimson, 'LCh clip');
    dot(clampC, clampLab[0], clampLab, theme.slate, 'RGB clamp');

    // patches + readout
    const bx = x0 + plotW + 30;
    const patch = (lab: Lab, y: number, label: string, sub: string) => {
      ctx.fillStyle = labToCss(lab); ctx.fillRect(bx, y, 120, 52); ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(bx, y, 120, 52);
      ctx.fillStyle = theme.inkSoft; ctx.font = '600 12px Inter, sans-serif'; ctx.fillText(label, bx, y + 66);
      ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.fillText(sub, bx, y + 80);
    };
    patch(lch, plotY + 6, 'LCh clip', `L* ${lch[0].toFixed(0)} · h ${this.hue}° kept`);
    patch(clampLab, plotY + 100, 'RGB clamp', `L* ${clampLab[0].toFixed(0)} · h ${clampHue.toFixed(0)}° drifted`);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`RGB clamp shifted lightness by ${Math.abs(clampLab[0] - this.L).toFixed(0)} and hue by ${Math.abs(((clampHue - this.hue + 540) % 360) - 180).toFixed(0)}°`, x0, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new LchClip());
