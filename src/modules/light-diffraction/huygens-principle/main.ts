import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Huygens {
  private stage: CanvasStage;
  private curv = 0.0;   // 0 = plane, 1 = strongly curved
  private step = 48;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.curv = hydrateNumber('curv', 0.0);
    this.step = hydrateNumber('step', 48);
    (document.getElementById('curv') as EncSlider).value = this.curv;
    (document.getElementById('step') as EncSlider).value = this.step;
    registerStateParam('curv', () => this.curv);
    registerStateParam('step', () => this.step);
    for (const id of ['curv', 'step']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'curv') this.curv = v; else this.step = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.curv = 0.0; this.step = 48;
      (document.getElementById('curv') as EncSlider).value = 0.0;
      (document.getElementById('step') as EncSlider).value = 48;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.5;
    const frontX = w * 0.34;
    const halfH = h * 0.34;

    // Curvature → radius of the wavefront. Plane: huge radius. Centre to the left.
    const minR = w * 0.32;          // most curved
    const maxR = w * 8;             // essentially flat
    const Rc = maxR - (maxR - minR) * this.curv;
    const centreX = frontX - Rc;     // centre of curvature (to the left)

    // Sample points along the wavefront arc spanning ±halfH.
    const nPts = 11;
    const pts: Array<{ x: number; y: number; nx: number; ny: number }> = [];
    for (let i = 0; i < nPts; i++) {
      const yy = cy - halfH + (2 * halfH) * (i / (nPts - 1));
      // x on circle of radius Rc centred at (centreX, cy): x = centreX + sqrt(Rc² − (yy−cy)²)
      const dy = yy - cy;
      const x = centreX + Math.sqrt(Math.max(0, Rc * Rc - dy * dy));
      // Outward normal direction (pointing right, away from centre).
      const nx = (x - centreX), ny = dy;
      const m = Math.hypot(nx, ny) || 1;
      pts.push({ x, y: yy, nx: nx / m, ny: ny / m });
    }

    // Draw the source wavefront (slate).
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // Secondary wavelets (circles radius = step) from each point.
    ctx.strokeStyle = theme.crimsonAlpha(0.4); ctx.lineWidth = 1;
    for (const p of pts) {
      ctx.beginPath(); ctx.arc(p.x, p.y, this.step, -Math.PI / 2.1, Math.PI / 2.1); ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 2 * Math.PI); ctx.fill();
    }

    // Envelope = advanced wavefront (concentric arc radius Rc+step). Gold.
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < nPts; i++) {
      const yy = cy - halfH + (2 * halfH) * (i / (nPts - 1));
      const dy = yy - cy;
      const RcE = Rc + this.step;
      const x = centreX + Math.sqrt(Math.max(0, RcE * RcE - dy * dy));
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();

    // Legend.
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillStyle = theme.slate; ctx.fillText('— wavefront at t', 16, h - 54);
    ctx.fillStyle = theme.crimson; ctx.fillText('— secondary wavelets', 16, h - 36);
    ctx.fillStyle = theme.goldDeep; ctx.fillText('— envelope: wavefront at t+Δt', 16, h - 18);

    // Readouts.
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    const kind = this.curv < 0.08 ? 'plane wave' : this.curv > 0.75 ? 'strongly spherical' : 'diverging wave';
    ctx.fillText(`${kind}   ·   wavelet radius = ${this.step} px`, 16, 30);
  }
}
window.addEventListener('DOMContentLoaded', () => new Huygens());
