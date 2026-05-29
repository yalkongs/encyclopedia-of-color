import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { labToXyz, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz, srgb8 } from '@core/math/color-adaptation';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const CHROMA_SCALE = 5; // Munsell chroma → a*b* radius

class MunsellTree {
  private stage: CanvasStage;
  private value = 6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.value = hydrateNumber('value', 6);
    (document.getElementById('value') as EncSlider).value = this.value;
    registerStateParam('value', () => this.value);
    (document.getElementById('value') as EncSlider).addEventListener('input', (e) => {
      this.value = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.value = 6;
      (document.getElementById('value') as EncSlider).value = 6;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const L = this.value * 10; // Value 0-10 → L* 0-100 (approx)

    const cx = w * 0.36, cy = h * 0.5, R = Math.min(w * 0.28, h * 0.4);
    fillRegionAA(ctx, cx - R, cy - R, cx + R, cy + R, (x, y) => {
      const sx = x - cx, sy = y - cy;
      const r = Math.hypot(sx, sy); if (r > R) return null;
      const C = (r / R) * 18;             // chroma 0-18
      const ang = Math.atan2(-sy, sx);
      const a = C * CHROMA_SCALE * Math.cos(ang), b = C * CHROMA_SCALE * Math.sin(ang);
      const lin = linearSrgbFromXyz(labToXyz([L, a, b]));
      return srgbInGamut(lin) ? srgb8(lin) : null;
    });
    // Chroma rings + hue spokes.
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1;
    for (let c = 4; c <= 16; c += 4) { ctx.beginPath(); ctx.arc(cx, cy, (c / 18) * R, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('hue around · chroma outward', cx, cy + R + 22);
    ctx.textAlign = 'left';

    // Side profile: the tree trunk silhouette (asymmetric).
    const sx0 = w * 0.72, sw = w * 0.22, sh = h * 0.62, sy0 = 46;
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24; const rad = Math.sin(Math.PI * t) * (0.5 + 0.3 * Math.sin(t * 5)) * sw * 0.4; ctx.lineTo(sx0 + sw / 2 + rad, sy0 + sh - t * sh); }
    for (let i = 24; i >= 0; i--) { const t = i / 24; const rad = Math.sin(Math.PI * t) * (0.5 + 0.3 * Math.cos(t * 4)) * sw * 0.4; ctx.lineTo(sx0 + sw / 2 - rad, sy0 + sh - t * sh); }
    ctx.closePath(); ctx.stroke();
    const sliceY = sy0 + sh - (this.value / 10) * sh;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx0, sliceY); ctx.lineTo(sx0 + sw, sliceY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Value ↑', sx0 + sw / 2, sy0 + sh + 16); ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`Value ${this.value.toFixed(1)} / 10 — a page of the colour tree (CIELAB approximation)`, w * 0.06, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new MunsellTree());
