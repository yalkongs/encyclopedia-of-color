import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class MoireVectors {
  private stage: CanvasStage;
  private dtheta = 8;
  private freq = 12;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dtheta = hydrateNumber('dtheta', 8);
    this.freq = hydrateNumber('freq', 12);
    const sd = document.getElementById('dtheta') as EncSlider;
    sd.value = this.dtheta;
    sd.addEventListener('input', (e) => { this.dtheta = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dtheta', () => Math.round(this.dtheta));
    const sf = document.getElementById('freq') as EncSlider;
    sf.value = this.freq;
    sf.addEventListener('input', (e) => { this.freq = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('freq', () => Math.round(this.freq));
    document.addEventListener('reset-params', () => { this.dtheta = 8; this.freq = 12; sd.value = 8; sf.value = 12; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const f = this.freq / 100;                 // cycles per px
    const th2 = (this.dtheta * Math.PI) / 180; // grating 2 angle (grating 1 at 0)
    // grating 1 along x, grating 2 rotated; line normal directions
    const k1x = f, k1y = 0;
    const k2x = f * Math.cos(th2), k2y = f * Math.sin(th2);

    // left panel: per-pixel product of two hard-bar gratings (multiply / min)
    const px0 = 30, py0 = 36, pw = Math.min(w * 0.6, h * 1.0) - 30, ph = h - 96;
    const img = ctx.createImageData(Math.ceil(pw), Math.ceil(ph));
    const d = img.data;
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const b1 = Math.cos(2 * Math.PI * (k1x * x + k1y * y)) > 0 ? 1 : 0;
        const b2 = Math.cos(2 * Math.PI * (k2x * x + k2y * y)) > 0 ? 1 : 0;
        const ink = b1 * b2;            // white only where both gratings are clear
        const v = ink ? 247 : 26;
        const i = (y * Math.ceil(pw) + x) * 4;
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, px0, py0);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(px0, py0, pw, ph);

    // right panel: frequency-vector diagram
    const ox = px0 + pw + (w - (px0 + pw)) * 0.5, oy = py0 + ph * 0.42;
    const scale = 120 / f; // normalise so each grating vector draws at 120 px, keeping the diagram in-panel
    const arrow = (vx: number, vy: number, col: string, lab: string) => {
      const ex = ox + vx * scale, ey = oy + vy * scale;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
      const a = Math.atan2(ey - oy, ex - ox);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 9 * Math.cos(a - 0.4), ey - 9 * Math.sin(a - 0.4)); ctx.lineTo(ex - 9 * Math.cos(a + 0.4), ey - 9 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
      ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(lab, ex + 6, ey + 4);
    };
    arrow(k1x, k1y, theme.slate, 'k₁');
    arrow(k2x, k2y, theme.gold, 'k₂');
    arrow(k1x - k2x, k1y - k2y, theme.crimson, 'kₘ = k₁ − k₂');

    const km = Math.hypot(k1x - k2x, k1y - k2y);
    const period = km > 1e-9 ? 1 / km : Infinity;
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('frequency-space vectors', ox, py0 + 16);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`Δθ = ${Math.round(this.dtheta)}° → moiré period ≈ ${isFinite(period) ? Math.round(period) + ' px' : '∞'} (|k₁−k₂| = 2f·sin(Δθ/2))`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MoireVectors());
