import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class Aberration {
  private stage: CanvasStage;
  private shape: 'sphere' | 'parabola' = 'sphere';
  private radius = 240;     // R for spherical; gives f = R/2

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const s = hydrateFromUrl('shape');
    if (s === 'sphere' || s === 'parabola') this.shape = s;
    this.radius = hydrateNumber('r', 240);
    (document.getElementById('shape') as EncToggle).value = this.shape;
    (document.getElementById('r') as EncSlider).value = this.radius;
    registerStateParam('shape', () => (this.shape === 'sphere' ? undefined : 'parabola'));
    registerStateParam('r', () => this.radius);
    (document.getElementById('shape') as EncToggle).addEventListener('change', (e: Event) => {
      this.shape = (e as CustomEvent).detail.value as typeof this.shape;
      this.draw(); notifyStateChange();
    });
    (document.getElementById('r') as EncSlider).addEventListener('input', (e) => {
      this.radius = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.shape = 'sphere'; this.radius = 240;
      (document.getElementById('shape') as EncToggle).value = 'sphere';
      (document.getElementById('r') as EncSlider).value = 240;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2;
    const vertexX = w * 0.82;
    const R = this.radius;
    const f = R / 2;   // paraxial focal
    // Optical axis
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // Mirror curve
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath();
    const apertureH = Math.min(160, h * 0.4);
    for (let yOff = -apertureH; yOff <= apertureH; yOff += 2) {
      let dx: number;
      if (this.shape === 'sphere') {
        // x = R - sqrt(R^2 - y^2)
        dx = R - Math.sqrt(Math.max(0, R * R - yOff * yOff));
      } else {
        // parabola: y^2 = 4f·dx → dx = y^2/(4f)
        dx = (yOff * yOff) / (4 * f);
      }
      const x = vertexX - dx;
      if (yOff === -apertureH) ctx.moveTo(x, cy + yOff);
      else ctx.lineTo(x, cy + yOff);
    }
    ctx.stroke();

    // Paraxial focal point
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(vertexX - f, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('F (paraxial)', vertexX - f - 50, cy + 18);

    // Parallel rays from left at various heights
    const rayCount = 9;
    for (let i = 0; i < rayCount; i++) {
      const yOff = (-apertureH * 0.9) + (1.8 * apertureH * i) / (rayCount - 1);
      // Hit point on mirror
      let dx: number;
      if (this.shape === 'sphere') {
        dx = R - Math.sqrt(Math.max(0, R * R - yOff * yOff));
      } else {
        dx = (yOff * yOff) / (4 * f);
      }
      const hitX = vertexX - dx;
      const hitY = cy + yOff;
      // Tangent normal computation
      let nx = 0, ny = 0;
      if (this.shape === 'sphere') {
        // Normal points from hit toward sphere centre at (vertexX - R, cy)
        const cxC = vertexX - R, cyC = cy;
        nx = cxC - hitX; ny = cyC - hitY;
      } else {
        // Parabola dx/dy = y/(2f), tangent (1, dx/dy) → normal = (-dx/dy, 1)
        const slope = yOff / (2 * f);
        nx = -slope; ny = 1;
        // We want normal pointing toward axis (positive x direction)
        if (nx < 0) { nx = -nx; ny = -ny; }
      }
      const nMag = Math.hypot(nx, ny);
      nx /= nMag; ny /= nMag;
      // Reflect incoming (dir = (+1, 0)) about normal: r = d - 2(d·n) n
      const dDotN = 1 * nx + 0 * ny;
      const rx = 1 - 2 * dDotN * nx;
      const ry = 0 - 2 * dDotN * ny;
      // Incoming
      ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, hitY); ctx.lineTo(hitX, hitY); ctx.stroke();
      // Reflected
      ctx.strokeStyle = theme.crimsonAlpha(0.6);
      ctx.beginPath();
      ctx.moveTo(hitX, hitY);
      ctx.lineTo(hitX + rx * 400, hitY + ry * 400);
      ctx.stroke();
    }

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`shape = ${this.shape}`, 16, 28);
    ctx.fillText(`R = ${R}    f = R/2 = ${f.toFixed(0)}`, 16, 50);
    ctx.fillStyle = this.shape === 'sphere' ? theme.crimson : theme.slate;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(this.shape === 'sphere'
                  ? 'PERIPHERAL rays focus SHORT — caustic forms ahead of F'
                  : 'ALL parallel rays converge at F exactly',
                 16, h - 24);
  }
}
window.addEventListener('DOMContentLoaded', () => new Aberration());
