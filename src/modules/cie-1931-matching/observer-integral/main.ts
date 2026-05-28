import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { spectralToXYZ, xyzToSrgb } from '@core/math/spectral';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 380, LMAX = 780;

class ObserverIntegral {
  private stage: CanvasStage;
  private peak = 520; private width = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.peak = hydrateNumber('peak', 520); this.width = hydrateNumber('width', 40);
    for (const id of ['peak', 'width'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.peak = 520; this.width = 40;
      (document.getElementById('peak') as EncSlider).value = 520;
      (document.getElementById('width') as EncSlider).value = 40;
      this.draw(); notifyStateChange();
    });
  }

  private spectrum = (l: number) => Math.exp(-(((l - this.peak) / this.width) ** 2));

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 44, padR = 24, padT = 36;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h * 0.5;
    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (v: number) => plotY + (1 - v / 1.8) * plotH;

    // Observer curves (faint).
    const cmfCurve = (key: 'xBar' | 'yBar' | 'zBar', color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath();
      CMF_1931_2DEG.forEach((r, i) => { const X = xOf(r.lambda), Y = yOf(r[key]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
      ctx.stroke();
    };
    cmfCurve('xBar', theme.crimsonAlpha(0.4)); cmfCurve('yBar', theme.slateAlpha(0.4)); cmfCurve('zBar', 'rgba(43,108,176,0.4)');

    // Spectrum (bold).
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2; ctx.beginPath();
    for (let px = 0; px <= plotW; px++) { const l = LMIN + (px / plotW) * (LMAX - LMIN); const X = plotX + px, Y = yOf(this.spectrum(l)); px === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('light E(λ) · faint = observer x̄ ȳ z̄', plotX, plotY - 8);

    // Integrate.
    const xyz = spectralToXYZ(this.spectrum);
    const mx = Math.max(xyz.X, xyz.Y, xyz.Z, 1e-6);
    const swatch = xyzToSrgb({ X: xyz.X / mx, Y: xyz.Y / mx, Z: xyz.Z / mx });

    // XYZ bars + swatch.
    const by = plotY + plotH + 50, bx = plotX, bw = plotW * 0.5, bmax = mx;
    const labels: Array<['X' | 'Y' | 'Z', number, string]> = [['X', xyz.X, theme.crimson], ['Y', xyz.Y, theme.slate], ['Z', xyz.Z, '#2b6cb0']];
    labels.forEach(([lab, val, color], i) => {
      const y = by + i * 30;
      ctx.fillStyle = theme.ink; ctx.font = '600 13px Inter, sans-serif'; ctx.fillText(lab, bx, y + 14);
      ctx.fillStyle = theme.paperRecess; ctx.fillRect(bx + 20, y, bw, 20);
      ctx.fillStyle = color; ctx.fillRect(bx + 20, y, (val / bmax) * bw, 20);
      ctx.fillStyle = theme.inkMute; ctx.font = '12px JetBrains Mono, monospace'; ctx.fillText(val.toFixed(1), bx + 26 + bw, y + 15);
    });

    const sx = plotX + plotW * 0.66, sw = plotW * 0.28, sh = 110;
    ctx.fillStyle = `rgb(${Math.round(swatch.r * 255)},${Math.round(swatch.g * 255)},${Math.round(swatch.b * 255)})`;
    ctx.fillRect(sx, by, sw, sh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(sx, by, sw, sh);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('the colour', sx + sw / 2, by + sh + 18);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new ObserverIntegral());
