import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

function nWater(lam: number): number {
  // Cauchy approx for water (lam in nm)
  return 1.324 + 3.46e3 / (lam * lam);
}

function deviationAngle(b: number, lam: number, k: number): number {
  // b = sin(theta_i). k = 1 (primary, 1 internal refl), 2 (secondary, 2 refl)
  const thetaI = Math.asin(Math.min(1, Math.max(0, b)));
  const n = nWater(lam);
  const thetaR = Math.asin(Math.sin(thetaI) / n);
  // Deviation = 2*(theta_i - theta_r) + k*(pi - 2*theta_r)
  const D = 2 * (thetaI - thetaR) + k * (Math.PI - 2 * thetaR);
  // Observed angle from antisolar point = pi - D for primary, D - pi for secondary
  return k === 1 ? Math.PI - D : D - Math.PI;
}

class RainbowDemo {
  private stage: CanvasStage;
  private b = 0.86;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.b = hydrateNumber('b', 0.86);
    const s = document.getElementById('b') as EncSlider; s.value = this.b;
    s.addEventListener('input', (e) => { this.b = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('b', () => this.b.toFixed(2));
    document.addEventListener('reset-params', () => { this.b = 0.86; s.value = 0.86; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`impact b/R = ${this.b.toFixed(2)} (Descartes ray ≈ 0.86 → min deviation)`, M, M);

    // Drop diagram (left)
    const dx = M + 200, dy = M + 200, dr = 130;
    g.fillStyle = 'rgba(120,170,220,0.25)';
    g.beginPath(); g.arc(dx, dy, dr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.stroke();
    // Incoming ray (white) at impact b
    const bPx = this.b * dr;
    const yIn = dy - bPx;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(M, yIn); g.lineTo(dx - Math.sqrt(dr * dr - bPx * bPx), yIn); g.stroke();
    // For each visible wavelength trace primary path
    const wavelengths = [410, 470, 530, 590, 650];
    for (const lam of wavelengths) {
      const n = nWater(lam);
      const thetaI = Math.asin(this.b);
      const thetaR = Math.asin(Math.sin(thetaI) / n);
      // Entry point on left of drop
      const ex = dx - Math.sqrt(dr * dr - bPx * bPx), ey = yIn;
      // Direction inside drop after refraction (bends toward normal)
      const ang = thetaI - thetaR; // change in direction
      let dirX = Math.cos(ang), dirY = Math.sin(ang);
      // Reflect off back of drop: ray hits opposite side
      // Use simple geometric: travel diameter rotated by 2*thetaR
      const t1 = 2 * dr * Math.cos(thetaR);
      const bx = ex + dirX * t1, by = ey + dirY * t1;
      // Reflect (back of drop, normal away from centre)
      const nx = (bx - dx) / dr, ny = (by - dy) / dr;
      const dot = dirX * nx + dirY * ny;
      dirX = dirX - 2 * dot * nx; dirY = dirY - 2 * dot * ny;
      // Travel chord to exit
      const t2 = 2 * dr * Math.cos(thetaR);
      const ex2 = bx + dirX * t2, ey2 = by + dirY * t2;
      // Refract out: angle restores to thetaI
      const ny2 = (ey2 - dy) / dr;
      // Final exit direction approx: just use deviation angle from antisolar
      const dev = deviationAngle(this.b, lam, 1);
      const outDir = Math.atan2(-1, 0) + Math.PI - dev; // approx
      void outDir;
      g.strokeStyle = wavelengthCss(lam); g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(bx, by);
      g.lineTo(ex2, ey2);
      // Outbound: 80 px in direction (-cos(dev), sin(dev)) approx
      g.lineTo(ex2 - 90 * Math.cos(dev), ey2 + 90 * Math.sin(dev) * Math.sign(ny2));
      g.stroke();
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('single drop · primary rainbow (1 internal reflection)', dx, dy + dr + 18);

    // Angle table (right)
    const tx = dx + dr + 70, ty = M + 30;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('observed angle from antisolar point', tx, ty);
    const lams = [410, 470, 530, 590, 650];
    for (let i = 0; i < lams.length; i++) {
      const lam = lams[i];
      const a1 = deviationAngle(this.b, lam, 1) * 180 / Math.PI;
      const a2 = deviationAngle(this.b, lam, 2) * 180 / Math.PI;
      const yy = ty + 30 + i * 30;
      g.fillStyle = wavelengthCss(lam); g.fillRect(tx, yy - 12, 24, 18);
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
      g.fillText(`${lam} nm`, tx + 32, yy);
      g.fillText(`primary ${a1.toFixed(1)}°`, tx + 110, yy);
      g.fillText(`secondary ${a2.toFixed(1)}°`, tx + 220, yy);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Alexander\'s dark band: 42°–51° gap with no rainbow caustic.', tx, ty + 30 + lams.length * 30 + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Descartes solved this in Météores (1637) using Snell\'s law + chord geometry; Newton added dispersion in 1666.', M, h - M);
  }
}

new RainbowDemo();
