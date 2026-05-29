import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { luvToXyz, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz, srgbCss } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const UVMAX = 150;

class LuvSlicing {
  private stage: CanvasStage;
  private L = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 60);
    (document.getElementById('L') as EncSlider).value = this.L;
    registerStateParam('L', () => this.L);
    (document.getElementById('L') as EncSlider).addEventListener('input', (e) => {
      this.L = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.L = 60;
      (document.getElementById('L') as EncSlider).value = 60;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const cx = w * 0.34, cy = h * 0.5, R = Math.min(w * 0.28, h * 0.4);
    const sc = R / UVMAX;
    const step = 3;
    for (let sy = -R; sy <= R; sy += step) {
      for (let sx = -R; sx <= R; sx += step) {
        const u = sx / sc, v = -sy / sc;
        const lin = linearSrgbFromXyz(luvToXyz([this.L, u, v]));
        if (!srgbInGamut(lin)) continue;
        ctx.fillStyle = srgbCss(lin);
        ctx.fillRect(cx + sx, cy + sy, step, step);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+u*', cx + R - 14, cy - 6); ctx.fillText('−u*', cx - R + 14, cy - 6);
    ctx.fillText('+v*', cx, cy - R + 12); ctx.fillText('−v*', cx, cy + R - 4);
    ctx.textAlign = 'left';

    const sx0 = w * 0.74, sw = w * 0.2, sh = h * 0.6, sy0 = 50;
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24; const rad = Math.pow(Math.sin(Math.PI * t), 0.7) * sw * 0.45; ctx.lineTo(sx0 + sw / 2 + rad, sy0 + sh - t * sh); }
    for (let i = 24; i >= 0; i--) { const t = i / 24; const rad = Math.pow(Math.sin(Math.PI * t), 0.7) * sw * 0.45; ctx.lineTo(sx0 + sw / 2 - rad, sy0 + sh - t * sh); }
    ctx.closePath(); ctx.stroke();
    const sliceY = sy0 + sh - (this.L / 100) * sh;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx0, sliceY); ctx.lineTo(sx0 + sw, sliceY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('L*', sx0 + sw / 2, sy0 + sh + 18); ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`L* = ${this.L} — the sRGB gamut on the u*v* plane`, w * 0.08, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new LuvSlicing());
