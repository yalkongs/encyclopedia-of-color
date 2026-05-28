import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { lensmakerFocal } from '@core/math/lens';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Lensmaker {
  private stage: CanvasStage;
  private R1 = 100;
  private R2 = -100;
  private n = 1.52;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.R1 = hydrateNumber('R1', 100);
    this.R2 = hydrateNumber('R2', -100);
    this.n = hydrateNumber('n', 1.52);
    (document.getElementById('R1') as EncSlider).value = this.R1;
    (document.getElementById('R2') as EncSlider).value = this.R2;
    (document.getElementById('n') as EncSlider).value = this.n;
    registerStateParam('R1', () => this.R1);
    registerStateParam('R2', () => this.R2);
    registerStateParam('n', () => this.n);
    for (const id of ['R1', 'R2', 'n']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'R1') this.R1 = v;
        else if (id === 'R2') this.R2 = v;
        else this.n = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.R1 = 100; this.R2 = -100; this.n = 1.52;
      (document.getElementById('R1') as EncSlider).value = 100;
      (document.getElementById('R2') as EncSlider).value = -100;
      (document.getElementById('n') as EncSlider).value = 1.52;
      this.draw(); notifyStateChange();
    });
  }

  // Bulge (px) of a face at the axis for radius R and aperture half-height hPx.
  // Positive bulge = surface curves toward +x (to the right).
  private bulge(R: number, hPx: number): number {
    if (Math.abs(R) > 280) return 0; // near-flat
    const Rpx = Math.abs(R) * 1.1;   // scale cm→px for drawing curvature
    const sag = Rpx - Math.sqrt(Math.max(0, Rpx * Rpx - hPx * hPx));
    const cap = Math.min(sag, hPx * 0.9);
    return Math.sign(R) * cap;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const lensX = w * 0.32, cy = h * 0.52;
    const hLens = Math.min(h * 0.30, 80);
    const sx = (w * 0.55) / 400; // cm → px for focal-distance mapping

    const f = lensmakerFocal(this.n, this.R1, this.R2);

    // Optical axis.
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, cy); ctx.lineTo(w - 8, cy); ctx.stroke();

    // Lens silhouette from the two radii (front face curves by R1, back by R2).
    // Front (left) face vertex offset, back (right) face vertex offset.
    const halfT = 10;
    const b1 = this.bulge(this.R1, hLens);  // front surface bulge direction
    const b2 = this.bulge(this.R2, hLens);
    // Lens body: front + back faces as quadratics with control points at the axis.
    ctx.fillStyle = theme.slateAlpha(0.18);
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lensX - halfT, cy - hLens);
    ctx.quadraticCurveTo(lensX - halfT - b1, cy, lensX - halfT, cy + hLens);
    ctx.lineTo(lensX + halfT, cy + hLens);
    ctx.quadraticCurveTo(lensX + halfT - b2, cy, lensX + halfT, cy - hLens);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Parallel rays → converge at focus F (thin-lens approximation).
    const Fx = lensX + f * sx;
    const nRays = 6;
    const converging = f > 0;
    for (let i = 0; i < nRays; i++) {
      const yy = cy - hLens * 0.8 + (1.6 * hLens) * (i / (nRays - 1));
      if (Math.abs(yy - cy) < 2) continue;
      ctx.strokeStyle = theme.crimsonAlpha(0.7); ctx.lineWidth = 1.3;
      // Incoming horizontal to lens.
      ctx.beginPath(); ctx.moveTo(8, yy); ctx.lineTo(lensX, yy); ctx.stroke();
      // Refracted toward (or away from) F.
      if (converging && Fx < w) {
        ctx.beginPath(); ctx.moveTo(lensX, yy); ctx.lineTo(Fx, cy);
        // extend past focus
        const dx = Fx - lensX, dy = cy - yy;
        ctx.lineTo(lensX + dx * 1.6, yy + dy * 1.6);
        ctx.stroke();
      } else {
        // Diverging (negative f): rays spread; dashed back-extension to virtual focus.
        const dx = lensX - Fx, dy = cy - yy; // direction away from virtual focus on left
        ctx.beginPath(); ctx.moveTo(lensX, yy); ctx.lineTo(lensX + dx * 0.8, yy + (-dy) * 0.8); ctx.stroke();
        ctx.strokeStyle = theme.inkAlpha(0.3); ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(lensX, yy); ctx.lineTo(Fx, cy); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // Focus marker.
    if (isFinite(Fx) && Math.abs(Fx - lensX) < w) {
      ctx.fillStyle = theme.goldDeep;
      ctx.beginPath(); ctx.arc(Fx, cy, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(converging ? "F'" : "F' (virtual)", Fx - 6, cy + 16);
    }

    // Shape label.
    let shape = 'meniscus';
    if (this.R1 > 0 && this.R2 < 0) shape = 'biconvex';
    else if (this.R1 < 0 && this.R2 > 0) shape = 'biconcave';
    else if (Math.abs(this.R1) > 280) shape = 'plano';
    else if (Math.abs(this.R2) > 280) shape = 'plano';

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`R₁ = ${this.R1} cm   R₂ = ${this.R2} cm   n = ${this.n.toFixed(2)}`, 16, 28);
    ctx.fillText(`f = ${isFinite(f) ? f.toFixed(1) + ' cm' : '∞'}   ·   ${shape}`, 16, 50);
    ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(f > 0 ? 'converging lens (P > 0)' : 'diverging lens (P < 0)', 16, 70);
  }
}
window.addEventListener('DOMContentLoaded', () => new Lensmaker());
