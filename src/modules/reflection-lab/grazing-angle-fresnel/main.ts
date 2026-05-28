import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { fresnelUnpolarized, DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class GrazingFresnel {
  private stage: CanvasStage;
  private thetaDeg = 70;
  private n = 1.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 70);
    this.n = hydrateNumber('n', 1.5);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    (document.getElementById('n') as EncSlider).value = this.n;
    registerStateParam('theta', () => this.thetaDeg);
    registerStateParam('n', () => this.n);
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.thetaDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n') as EncSlider).addEventListener('input', (e) => {
      this.n = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 70; this.n = 1.5;
      (document.getElementById('theta') as EncSlider).value = 70;
      (document.getElementById('n') as EncSlider).value = 1.5;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.55;
    const cx = w * 0.4;
    const t = this.thetaDeg * DEG;
    const R = fresnelUnpolarized(t, 1, this.n);

    // Surface
    ctx.fillStyle = theme.slateAlpha(0.08);
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    // Normal
    ctx.setLineDash([4, 4]); ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.setLineDash([]);

    const len = Math.min(w, h) * 0.4;
    const ix = cx - Math.sin(t) * len, iy = cy - Math.cos(t) * len;
    const rx = cx + Math.sin(t) * len, ry = cy - Math.cos(t) * len;

    // Incident
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();
    // Reflected (intensity ∝ R)
    ctx.strokeStyle = theme.inkAlpha(0.2 + R * 0.7);
    ctx.lineWidth = 1.5 + R * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rx, ry); ctx.stroke();

    // Reflectance bar — right side
    const barX = w - 60;
    const barY0 = h - 80, barH = h * 0.55;
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.strokeRect(barX, barY0 - barH, 30, barH);
    ctx.fillStyle = theme.ink;
    ctx.fillRect(barX + 2, barY0 - barH * R, 26, barH * R);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('R', barX + 8, barY0 + 16);
    ctx.fillText('1.0', barX - 22, barY0 - barH + 4);
    ctx.fillText('0.0', barX - 22, barY0 + 4);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ = ${this.thetaDeg}°    n = ${this.n.toFixed(2)}`, 16, 30);
    ctx.fillText(`R(unpolarised) = ${(R * 100).toFixed(1)} %`, 16, 52);
    ctx.fillStyle = this.thetaDeg > 80 ? theme.crimson : axisStyle.label;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(this.thetaDeg > 80
                  ? 'GRAZING — reflection approaches 100 % regardless of material'
                  : 'normal angles — material-dependent reflectance', 16, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new GrazingFresnel());
