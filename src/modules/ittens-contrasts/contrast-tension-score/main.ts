import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, xyzToLab } from '@core/math/colorimetry';
import { xyzFromLinearSrgb } from '@core/math/color-adaptation';
import { srgbToLinear } from '@core/math/oklab';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const DEG = Math.PI / 180;
function hslRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const lab = (h: number, l: number): Lab => {
  const lin = hslRgb(h, 0.75, l / 100).map((v) => srgbToLinear(v / 255)) as [number, number, number];
  return xyzToLab(xyzFromLinearSrgb(lin));
};
const cssOf = (h: number, l: number) => `rgb(${hslRgb(h, 0.75, l / 100).map((v) => v | 0).join(',')})`;

class TensionScore {
  private stage: CanvasStage;
  private hA = 40; private lA = 70; private hB = 220; private lB = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hA = hydrateNumber('hA', 40); this.lA = hydrateNumber('lA', 70); this.hB = hydrateNumber('hB', 220); this.lB = hydrateNumber('lB', 40);
    for (const k of ['hA', 'lA', 'hB', 'lB'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.hA = 40; this.lA = 70; this.hB = 220; this.lB = 40;
      (['hA', 'lA', 'hB', 'lB'] as const).forEach((k) => ((document.getElementById(k) as EncSlider).value = this[k]));
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const A = lab(this.hA, this.lA), B = lab(this.hB, this.lB);
    const hueA = (Math.atan2(A[2], A[1]) / DEG + 360) % 360, hueB = (Math.atan2(B[2], B[1]) / DEG + 360) % 360;
    let dh = Math.abs(hueA - hueB); if (dh > 180) dh = 360 - dh;
    const CA = Math.hypot(A[1], A[2]), CB = Math.hypot(B[1], B[2]);
    const tHue = 0.5 * Math.sin((dh / 2) * DEG);
    const tVal = 0.3 * Math.abs(A[0] - B[0]) / 100;
    const tSat = 0.2 * Math.abs(CA - CB) / 130;
    const T = tHue + tVal + tSat;

    // two swatches
    const sw = 130, sh = 80;
    ctx.fillStyle = cssOf(this.hA, this.lA); ctx.fillRect(30, 30, sw, sh);
    ctx.fillStyle = cssOf(this.hB, this.lB); ctx.fillRect(30 + sw + 14, 30, sw, sh);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(30, 30, sw, sh); ctx.strokeRect(30 + sw + 14, 30, sw, sh);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('A', 30 + sw / 2, 30 + sh + 16); ctx.fillText('B', 30 + sw * 1.5 + 14, 30 + sh + 16);

    // headline
    ctx.fillStyle = theme.crimson; ctx.font = '700 40px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`T = ${T.toFixed(2)}`, 30 + 2 * sw + 50, 78);

    // stacked bar
    const bx = 30, by = 150, bw = w - 60, bh = 46;
    const segs = [
      { v: tHue, c: theme.crimson, label: `hue  ${tHue.toFixed(2)}` },
      { v: tVal, c: theme.slate, label: `value  ${tVal.toFixed(2)}` },
      { v: tSat, c: theme.gold, label: `saturation  ${tSat.toFixed(2)}` },
    ];
    let xx = bx;
    for (const s of segs) {
      const sw2 = s.v * bw; // total max 1.0 → full bar
      ctx.fillStyle = s.c; ctx.fillRect(xx, by, sw2, bh);
      xx += sw2;
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    // legend
    let ly = by + bh + 24;
    for (const s of segs) {
      ctx.fillStyle = s.c; ctx.fillRect(bx, ly - 10, 14, 12);
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(s.label, bx + 22, ly);
      ly += 22;
    }
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Δh ${dh.toFixed(0)}°  ·  ΔL* ${Math.abs(A[0] - B[0]).toFixed(0)}  ·  ΔC ${Math.abs(CA - CB).toFixed(0)}`, bx + 220, by + bh + 24);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText("Itten's principles as one heuristic — not a measured psychophysical quantity", w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new TensionScore());
