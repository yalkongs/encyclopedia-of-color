import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { snellRefract, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ApparentDepth {
  private stage: CanvasStage;
  private depth = 140;
  private n = 1.33;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.depth = hydrateNumber('d', 140); this.n = hydrateNumber('n', 1.33);
    (document.getElementById('d') as EncSlider).value = this.depth;
    (document.getElementById('n') as EncSlider).value = this.n;
    registerStateParam('d', () => this.depth);
    registerStateParam('n', () => this.n);
    (document.getElementById('d') as EncSlider).addEventListener('input', (e) => {
      this.depth = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n') as EncSlider).addEventListener('input', (e) => {
      this.n = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.depth = 140; this.n = 1.33;
      (document.getElementById('d') as EncSlider).value = 140;
      (document.getElementById('n') as EncSlider).value = 1.33;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const surfaceY = h * 0.32;
    const objX = w * 0.5;
    const realY = surfaceY + this.depth;
    const apparentY = surfaceY + this.depth / this.n;

    // Water
    ctx.fillStyle = theme.slateAlpha(0.08);
    ctx.fillRect(0, surfaceY, w, h - surfaceY);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, surfaceY); ctx.lineTo(w, surfaceY); ctx.stroke();

    // Two rays from real coin, refract at surface, project apparent depth
    const eyeX = w * 0.85, eyeY = surfaceY - 80;
    for (const offsetX of [-15, 15]) {
      // Ray from coin at (objX+offsetX, realY) → surface at angle, then to eye
      // We'll pick angle so it reaches eye after refraction.
      // Numerical: pick surface point and compute the refracted direction.
      const sx = objX + offsetX * 4;  // surface crossing
      const dyW = sx - (objX + offsetX);
      const dxW = realY - surfaceY;
      const t1 = Math.atan2(dyW, dxW);
      const t2 = snellRefract(this.n, 1.0, t1);
      if (t2 === null) continue;
      // Below water
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(objX + offsetX, realY); ctx.lineTo(sx, surfaceY); ctx.stroke();
      // Above water — refracted
      const upLen = 200;
      const ux = sx + Math.sin(t2) * upLen;
      const uy = surfaceY - Math.cos(t2) * upLen;
      ctx.strokeStyle = theme.slate;
      ctx.beginPath(); ctx.moveTo(sx, surfaceY); ctx.lineTo(ux, uy); ctx.stroke();
      // Extended back-trace (dashed) to apparent position
      ctx.strokeStyle = theme.goldAlpha(0.55);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, surfaceY);
      const bx = sx - Math.sin(t2) * 300;
      const by = surfaceY + Math.cos(t2) * 300;
      ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Real coin
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(objX, realY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('real coin', objX + 14, realY + 4);

    // Apparent (virtual) coin
    ctx.strokeStyle = theme.goldDeep;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(objX, apparentY, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText('apparent', objX + 14, apparentY + 4);

    // Eye marker
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(eyeX, eyeY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('observer', eyeX - 20, eyeY - 12);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`real depth   = ${this.depth} px`, 16, 28);
    ctx.fillText(`apparent     = ${(this.depth / this.n).toFixed(0)} px`, 16, 50);
    ctx.fillText(`ratio  d/n   = 1/${this.n.toFixed(2)}`, 16, 72);
    void RAD;
  }
}
window.addEventListener('DOMContentLoaded', () => new ApparentDepth());
