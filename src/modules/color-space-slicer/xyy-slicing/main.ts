import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { SPECTRAL_LOCUS, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz, srgb8 } from '@core/math/color-adaptation';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const XMAX = 0.74, YMAX = 0.84;

class XyySlicing {
  private stage: CanvasStage;
  private Y = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.Y = hydrateNumber('Y', 50);
    (document.getElementById('Y') as EncSlider).value = this.Y;
    registerStateParam('Y', () => this.Y);
    (document.getElementById('Y') as EncSlider).addEventListener('input', (e) => {
      this.Y = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.Y = 50;
      (document.getElementById('Y') as EncSlider).value = 50;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const Yv = this.Y / 100;

    const pad = 40, plotX = pad, plotY = 24, plotW = w * 0.62, plotH = h - 70;
    const s = Math.min(plotW / XMAX, plotH / YMAX);
    const px = (x: number) => plotX + x * s, py = (y: number) => plotY + plotH - y * s;

    // Gamut-bounded slice fill.
    fillRegionAA(ctx, plotX, plotY, plotX + plotW, plotY + plotH, (sxp, syp) => {
      const x = (sxp - plotX) / s, y = (plotY + plotH - syp) / s;
      if (y < 1e-3 || x + y > 1) return null;
      const lin = linearSrgbFromXyz([(x / y) * Yv, Yv, ((1 - x - y) / y) * Yv]);
      return srgbInGamut(lin) ? srgb8(lin) : null;
    });
    // Spectral locus outline.
    ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 1.2;
    ctx.beginPath(); SPECTRAL_LOCUS.forEach(([x, y], i) => { const X = px(x), Y = py(y); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX, plotY); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX + XMAX * s, py(0)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('x', px(0.72), py(0) + 14); ctx.fillText('y', plotX - 14, plotY + 6);

    // Side profile silhouette (xyY solid: pinched at top/bottom).
    const sx0 = w * 0.74, sw = w * 0.2, sh = h * 0.6, sy0 = 50;
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const t = i / 20; const rad = Math.sin(Math.PI * t) * sw * 0.45; ctx.lineTo(sx0 + sw / 2 + rad, sy0 + sh - t * sh); }
    for (let i = 20; i >= 0; i--) { const t = i / 20; const rad = Math.sin(Math.PI * t) * sw * 0.45; ctx.lineTo(sx0 + sw / 2 - rad, sy0 + sh - t * sh); }
    ctx.closePath(); ctx.stroke();
    const sliceY = sy0 + sh - Yv * sh;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx0, sliceY); ctx.lineTo(sx0 + sw, sliceY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Y', sx0 + sw / 2, sy0 + sh + 18);
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`luminance Y = ${this.Y}% — displayable colours at this brightness`, plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new XyySlicing());
