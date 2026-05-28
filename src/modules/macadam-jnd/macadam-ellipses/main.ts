import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { MACADAM_ELLIPSES, SPECTRAL_LOCUS, xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const XMAX = 0.74, YMAX = 0.84;

class MacAdamEllipses {
  private stage: CanvasStage;
  private mag = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mag = hydrateNumber('mag', 10);
    (document.getElementById('mag') as EncSlider).value = this.mag;
    registerStateParam('mag', () => this.mag);
    (document.getElementById('mag') as EncSlider).addEventListener('input', (e) => {
      this.mag = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.mag = 10;
      (document.getElementById('mag') as EncSlider).value = 10;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const pad = 44;
    const plotX = pad, plotY = 24, plotW = w - pad * 1.5, plotH = h - 70;
    const s = Math.min(plotW / XMAX, plotH / YMAX);
    const px = (x: number) => plotX + x * s;
    const py = (y: number) => plotY + plotH - y * s;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX, plotY); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX + XMAX * s, py(0)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let t = 0; t <= 0.7; t += 0.1) { ctx.fillText(t.toFixed(1), px(t), py(0) + 14); }
    ctx.textAlign = 'right';
    for (let t = 0.1; t <= 0.8; t += 0.1) { ctx.fillText(t.toFixed(1), plotX - 6, py(t) + 3); }
    ctx.textAlign = 'left'; ctx.fillText('x', px(0.7) + 12, py(0) + 4); ctx.fillText('y', plotX - 6, plotY + 4);

    // Spectral locus.
    ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 1.4;
    ctx.beginPath();
    SPECTRAL_LOCUS.forEach(([x, y], i) => { const X = px(x), Y = py(y); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
    ctx.closePath(); ctx.stroke();

    // The 25 ellipses, magnified.
    for (const e of MACADAM_ELLIPSES) {
      ctx.save();
      ctx.translate(px(e.x), py(e.y));
      ctx.rotate(-e.theta * Math.PI / 180);
      ctx.beginPath();
      ctx.ellipse(0, 0, e.a * this.mag * s, e.b * this.mag * s, 0, 0, 2 * Math.PI);
      ctx.fillStyle = xyToCss(e.x, e.y); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.inkAlpha(0.7); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ellipses magnified ${this.mag}× — tiny in blue, vast in green`, plotX, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MacAdamEllipses());
