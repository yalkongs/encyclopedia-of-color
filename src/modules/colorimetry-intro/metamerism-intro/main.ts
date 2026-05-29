import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { spectralToXYZ, xyzToSrgb, rgbToCssRgb, type SpectrumFn } from '@core/math/spectral';
import { Lab, xyzToLab, deltaE76 } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 400, LMAX = 700;
const gauss = (l: number, mu: number, sd: number) => Math.exp(-0.5 * ((l - mu) / sd) ** 2);
const smooth: SpectrumFn = (l) => 0.45 * gauss(l, 540, 70) + 0.06;
const K = 1 / spectralToXYZ(() => 1).Y; // normalise so a flat unit SPD → Y=1
function lab(S: SpectrumFn): Lab {
  const xyz = spectralToXYZ(S);
  return xyzToLab([xyz.X * K, xyz.Y * K, xyz.Z * K]);
}
function css(S: SpectrumFn): string {
  const xyz = spectralToXYZ(S);
  return rgbToCssRgb(xyzToSrgb({ X: xyz.X * K, Y: xyz.Y * K, Z: xyz.Z * K }));
}
const SMOOTH_LAB = lab(smooth);

class Metamerism {
  private stage: CanvasStage;
  private b1 = 62; private b2 = 136; private b3 = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.b1 = hydrateNumber('b1', 62); this.b2 = hydrateNumber('b2', 136); this.b3 = hydrateNumber('b3', 80);
    for (const k of ['b1', 'b2', 'b3'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.b1 = 62; this.b2 = 136; this.b3 = 80;
      (document.getElementById('b1') as EncSlider).value = 62;
      (document.getElementById('b2') as EncSlider).value = 136;
      (document.getElementById('b3') as EncSlider).value = 80;
      this.draw(); notifyStateChange();
    });
  }

  private bands(): SpectrumFn {
    return (l) => (this.b1 / 100) * gauss(l, 450, 11) + (this.b2 / 100) * gauss(l, 540, 11) + (this.b3 / 100) * gauss(l, 610, 11);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const bands = this.bands();
    const dE = deltaE76(SMOOTH_LAB, lab(bands));
    const matched = dE < 2;

    // SPD plot
    const x0 = 50, plotY = 26, plotW = w - x0 - 180, plotH = h - 80;
    const lx = (l: number) => x0 + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    let maxV = 0;
    for (let l = LMIN; l <= LMAX; l += 5) maxV = Math.max(maxV, smooth(l), bands(l));
    const py = (v: number) => plotY + plotH - (v / (maxV * 1.1)) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, plotY); ctx.lineTo(x0, plotY + plotH); ctx.lineTo(x0 + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    for (const l of [400, 500, 600, 700]) ctx.fillText(String(l), lx(l) - 8, plotY + plotH + 14);
    ctx.fillText('nm', x0 + plotW - 14, plotY + plotH + 28);

    const curve = (S: SpectrumFn, color: string, lw: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      for (let l = LMIN; l <= LMAX; l += 2) { const X = lx(l), Y = py(S(l)); l === LMIN ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke();
    };
    curve(smooth, theme.slate, 2.4);
    curve(bands, theme.crimson, 2.4);

    // legend
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = theme.slate; ctx.fillRect(x0 + 8, plotY + 4, 14, 3); ctx.fillStyle = theme.inkSoft; ctx.fillText('smooth (fixed)', x0 + 26, plotY + 8);
    ctx.fillStyle = theme.crimson; ctx.fillRect(x0 + 8, plotY + 20, 14, 3); ctx.fillStyle = theme.inkSoft; ctx.fillText('three bands (yours)', x0 + 26, plotY + 24);

    // swatches
    const sx = x0 + plotW + 30, sw = 120, sh = 70;
    ctx.fillStyle = css(smooth); ctx.fillRect(sx, plotY + 6, sw, sh); ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(sx, plotY + 6, sw, sh);
    ctx.fillStyle = css(bands); ctx.fillRect(sx, plotY + 6 + sh + 16, sw, sh); ctx.strokeRect(sx, plotY + 6 + sh + 16, sw, sh);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('smooth colour', sx, plotY + 6 + sh + 14);
    ctx.fillText('three-band colour', sx, plotY + 6 + 2 * sh + 30);

    ctx.fillStyle = matched ? theme.slate : theme.crimson; ctx.font = '700 22px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(matched ? `metameric match · ΔE ${dE.toFixed(1)}` : `ΔE ${dE.toFixed(1)}`, x0, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Metamerism());
