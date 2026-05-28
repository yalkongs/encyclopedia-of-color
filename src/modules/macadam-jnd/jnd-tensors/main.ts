import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { MACADAM_ELLIPSES, SPECTRAL_LOCUS, xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const XMAX = 0.74, YMAX = 0.84;

class JndTensors {
  private stage: CanvasStage;
  private idx = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.idx = hydrateNumber('idx', 3);
    (document.getElementById('idx') as EncSlider).value = this.idx;
    registerStateParam('idx', () => this.idx);
    (document.getElementById('idx') as EncSlider).addEventListener('input', (e) => {
      this.idx = Math.round((e.target as EncSlider).value); this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.idx = 3;
      (document.getElementById('idx') as EncSlider).value = 3;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const e = MACADAM_ELLIPSES[this.idx];

    // --- Left: zoomed tensor view. ---
    const cx = w * 0.32, cy = h * 0.48, R = Math.min(w * 0.24, h * 0.34);
    const aPx = R, bPx = R * (e.b / e.a); // scale so semi-major fills R
    const geo = Math.sqrt(aPx * bPx);
    // Reference circle (uniform-space expectation).
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, geo, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    // Measured ellipse.
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-e.theta * Math.PI / 180);
    ctx.beginPath(); ctx.ellipse(0, 0, aPx, bPx, 0, 0, 2 * Math.PI);
    ctx.fillStyle = xyToCss(e.x, e.y); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.stroke();
    // Axes.
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-aPx, 0); ctx.lineTo(aPx, 0); ctx.moveTo(0, -bPx); ctx.lineTo(0, bPx); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('solid: measured JND ellipse · dashed: uniform circle', cx, cy + R + 28);
    ctx.textAlign = 'left';

    // --- Right: mini CIE diagram with the selected centre highlighted. ---
    const mpX = w * 0.62, mpY = h * 0.12, mpW = w * 0.32, mpH = h * 0.6;
    const s = Math.min(mpW / XMAX, mpH / YMAX);
    const px = (x: number) => mpX + x * s, py = (y: number) => mpY + mpH - y * s;
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.beginPath(); SPECTRAL_LOCUS.forEach(([x, y], i) => { const X = px(x), Y = py(y); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }); ctx.closePath(); ctx.stroke();
    MACADAM_ELLIPSES.forEach((m, i) => {
      ctx.save(); ctx.translate(px(m.x), py(m.y)); ctx.rotate(-m.theta * Math.PI / 180);
      ctx.beginPath(); ctx.ellipse(0, 0, m.a * 10 * s, m.b * 10 * s, 0, 0, 2 * Math.PI);
      if (i === this.idx) { ctx.fillStyle = theme.crimson; ctx.fill(); }
      else { ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
    });

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`centre #${this.idx + 1}  (x ${e.x.toFixed(3)}, y ${e.y.toFixed(3)})`, w * 0.08, h - 30);
    ctx.fillText(`a ${(e.a * 1000).toFixed(2)} · b ${(e.b * 1000).toFixed(2)} (×10⁻³) · θ ${e.theta.toFixed(0)}° · anisotropy ${(e.a / e.b).toFixed(1)}×`, w * 0.08, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new JndTensors());
