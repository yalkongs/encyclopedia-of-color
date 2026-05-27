import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import {
  snellRefract, cauchyN, DEG,
  spectralToXYZ, xyzToSrgb, rgbToCssRgb,
} from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Newton's prism: equilateral-like triangular glass with apex angle α.
 * Incoming horizontal ray refracts twice (entry + exit) and disperses by
 * wavelength via Cauchy n(λ) = B + C/λ².
 */
class NewtonsPrism {
  private stage: CanvasStage;
  private apexDeg = 60;
  private theta1Deg = 45;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.apexDeg = hydrateNumber('alpha', 60);
    this.theta1Deg = hydrateNumber('theta', 45);
    (document.getElementById('alpha') as EncSlider).value = this.apexDeg;
    (document.getElementById('theta') as EncSlider).value = this.theta1Deg;

    registerStateParam('alpha', () => this.apexDeg);
    registerStateParam('theta', () => this.theta1Deg);

    (document.getElementById('alpha') as EncSlider).addEventListener('input', (e) => {
      this.apexDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.theta1Deg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    (document.getElementById('alpha') as EncSlider).value = 60;
    (document.getElementById('theta') as EncSlider).value = 45;
    this.apexDeg = 60; this.theta1Deg = 45;
    this.draw(); notifyStateChange();
  }

  private wavelengthColor(lambdaNm: number): string {
    const S = (l: number) => (Math.abs(l - lambdaNm) < 5 ? 1 : 0);
    const xyz = spectralToXYZ(S);
    const peak = Math.max(xyz.X, xyz.Y, xyz.Z) || 1;
    const rgb = xyzToSrgb({ X: xyz.X / peak, Y: xyz.Y / peak, Z: xyz.Z / peak });
    const m = Math.max(rgb.r, rgb.g, rgb.b);
    if (m > 0) { rgb.r /= m; rgb.g /= m; rgb.b /= m; }
    return rgbToCssRgb(rgb);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const apex = this.apexDeg * DEG;
    const t1 = this.theta1Deg * DEG;

    // Prism triangle: apex at top, equilateral if apex=60.
    // Center of prism roughly at (cx, cy)
    const cx = w * 0.4;
    const cy = h * 0.55;
    const side = Math.min(w * 0.32, h * 0.5);

    // Vertices: top apex, bottom-left, bottom-right.
    const halfBase = side * Math.sin(apex / 2);
    const height = side * Math.cos(apex / 2);
    const top    = { x: cx, y: cy - height * 0.55 };
    const left   = { x: cx - halfBase, y: cy + height * 0.45 };
    const right  = { x: cx + halfBase, y: cy + height * 0.45 };

    // Prism outline
    ctx.strokeStyle = theme.inkAlpha(0.7);
    ctx.fillStyle = theme.inkAlpha(0.04);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Entry face normal (perpendicular to top-left edge, pointing left into air)
    const edgeAngle = Math.atan2(left.y - top.y, left.x - top.x);   // direction along edge
    const entryNormal = edgeAngle - Math.PI / 2;                    // normal points outward (left)
    // Entry point — midway on left edge
    const ePoint = {
      x: (top.x + left.x) / 2,
      y: (top.y + left.y) / 2,
    };

    // For each visible wavelength, ray-trace and draw output rays
    const wavelengths = [410, 440, 470, 500, 530, 560, 590, 620, 650, 680];
    for (const lambda of wavelengths) {
      const n = cauchyN(lambda);
      // Refract at entry: angle inside glass relative to normal
      const t2 = snellRefract(1.0, n, t1);
      if (t2 === null) continue;
      const insideDir = entryNormal + Math.PI - t2;   // pointing into prism

      // Trace ray inside until it hits the right edge.
      // Right edge endpoints: top → right
      const hit = lineIntersect(ePoint, addPolar(ePoint, insideDir, 9999), top, right);
      if (!hit) continue;
      // Exit-face normal (outward from right edge)
      const exitEdgeAngle = Math.atan2(right.y - top.y, right.x - top.x);
      const exitNormalIn  = exitEdgeAngle - Math.PI / 2; // points outward
      // Angle of inside ray relative to exit normal
      const insideRel = (insideDir - (exitNormalIn + Math.PI) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
      const t3Mag = Math.abs(insideRel);
      const t4 = snellRefract(n, 1.0, t3Mag);
      if (t4 === null) continue;
      const sign = Math.sign(insideRel) || 1;
      const exitDir = exitNormalIn + sign * t4;

      const exitEnd = addPolar(hit, exitDir, w);

      // Draw incident ray (only for the green band, otherwise overlapping clutters)
      if (lambda === 530) {
        const inStart = addPolar(ePoint, entryNormal + Math.PI - t1 + Math.PI, w);
        ctx.strokeStyle = theme.inkAlpha(0.85);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(inStart.x, inStart.y); ctx.lineTo(ePoint.x, ePoint.y); ctx.stroke();
      }
      // Inside (light gray)
      ctx.strokeStyle = theme.inkAlpha(0.18);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ePoint.x, ePoint.y); ctx.lineTo(hit.x, hit.y); ctx.stroke();

      // Exit ray colored by wavelength
      ctx.strokeStyle = this.wavelengthColor(lambda);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hit.x, hit.y); ctx.lineTo(exitEnd.x, exitEnd.y); ctx.stroke();
    }

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`α = ${this.apexDeg.toFixed(0)}°`, 16, 28);
    ctx.fillText(`θ₁ = ${this.theta1Deg.toFixed(0)}°`, 16, 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Cauchy:  n(λ) = 1.5046 + 4200/λ²  (BK7 glass)', 16, 72);
  }
}

function addPolar(p: { x: number; y: number }, dir: number, len: number) {
  return { x: p.x + Math.cos(dir) * len, y: p.y + Math.sin(dir) * len };
}

function lineIntersect(
  p1: { x: number; y: number }, p2: { x: number; y: number },
  q1: { x: number; y: number }, q2: { x: number; y: number },
): { x: number; y: number } | null {
  const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y;
  const dx2 = q2.x - q1.x, dy2 = q2.y - q1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-6) return null;
  const t = ((q1.x - p1.x) * dy2 - (q1.y - p1.y) * dx2) / denom;
  const u = ((q1.x - p1.x) * dy1 - (q1.y - p1.y) * dx1) / denom;
  if (u < 0 || u > 1) return null;
  return { x: p1.x + t * dx1, y: p1.y + t * dy1 };
}

window.addEventListener('DOMContentLoaded', () => new NewtonsPrism());
