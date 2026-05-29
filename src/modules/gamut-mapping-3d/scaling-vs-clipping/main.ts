import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToXyz, labToCss, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const DEG = Math.PI / 180;
const N = 60;
function inG(L: number, a: number, b: number) { return srgbInGamut(linearSrgbFromXyz(labToXyz([L, a, b] as Lab))); }
function boundaryChroma(L: number, hueDeg: number): number {
  const ca = Math.cos(hueDeg * DEG), cb = Math.sin(hueDeg * DEG);
  let lo = 0, hi = 160;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (inG(L, m * ca, m * cb)) lo = m; else hi = m; }
  return lo;
}

class ScaleVsClip {
  private stage: CanvasStage;
  private L = 60; private C = 100; private mode = 'scale';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 60); this.C = hydrateNumber('C', 100); this.mode = hydrateFromUrl('mode') ?? 'scale';
    for (const k of ['L', 'C'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const mt = document.getElementById('mode') as EncToggle;
    mt.value = this.mode;
    mt.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => {
      this.L = 60; this.C = 100; this.mode = 'scale';
      (document.getElementById('L') as EncSlider).value = 60;
      (document.getElementById('C') as EncSlider).value = 100;
      mt.value = 'scale'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const hues = Array.from({ length: N }, (_, i) => (i * 360) / N);
    const Cbs = hues.map((hh) => boundaryChroma(this.L, hh));
    const k = Math.min(1, ...Cbs.map((cbv) => cbv / this.C));

    const M = 150, cx = w * 0.42, cy = h * 0.5;
    const R = Math.min(h * 0.4, w * 0.32);
    const sc = R / M;
    const px = (a: number) => cx + a * sc, py = (b: number) => cy - b * sc;

    // gamut boundary outline at this L
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2; ctx.beginPath();
    hues.forEach((hh, i) => { const cbv = Cbs[i]; const X = px(cbv * Math.cos(hh * DEG)), Y = py(cbv * Math.sin(hh * DEG)); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(-M), py(0)); ctx.lineTo(px(M), py(0)); ctx.moveTo(px(0), py(-M)); ctx.lineTo(px(0), py(M)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('a*', px(M) - 16, py(0) - 6); ctx.fillText('b*', px(0) + 6, py(M) + 12);

    // source ring (faint)
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.setLineDash([3, 3]); ctx.beginPath();
    ctx.arc(cx, cy, this.C * sc, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);

    // mapped points
    hues.forEach((hh, i) => {
      const ca = Math.cos(hh * DEG), cb = Math.sin(hh * DEG);
      const Cout = this.mode === 'scale' ? this.C * k : Math.min(this.C, Cbs[i]);
      const lab: Lab = [this.L, Cout * ca, Cout * cb];
      ctx.beginPath(); ctx.arc(px(lab[1]), py(lab[2]), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = labToCss(lab); ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 0.8; ctx.stroke();
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    const note = this.mode === 'scale'
      ? `global scale k=${k.toFixed(2)} — ring stays circular, every hue desaturated equally`
      : `per-colour clip — ring follows the lumpy gamut boundary, relationships distorted`;
    ctx.fillText(note, 24, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ScaleVsClip());
