import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

const A_DEG = 60; // prism apex angle
const A = A_DEG * Math.PI / 180;

function nIce(lam: number): number {
  return 1.305 + 5.2e3 / (lam * lam);
}

/** Deviation through a 60° prism: δ = θ_i + arcsin(n sin(A − arcsin(sin θ_i / n))) − A. */
function deviationDeg(thetaIDeg: number, n: number): number | null {
  const ti = thetaIDeg * Math.PI / 180;
  const tr = Math.asin(Math.sin(ti) / n);
  const tr2 = A - tr;
  const s = n * Math.sin(tr2);
  if (s > 1 || s < -1) return null;
  const te = Math.asin(s);
  return (ti + te - A) * 180 / Math.PI;
}

class Halo {
  private stage: CanvasStage;
  private t = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 40);
    const s = document.getElementById('t') as EncSlider; s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    document.addEventListener('reset-params', () => { this.t = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const nMid = nIce(530);
    const dMid = deviationDeg(this.t, nMid);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`θᵢ = ${this.t}° · ice n ≈ ${nMid.toFixed(3)} · deviation δ ≈ ${dMid?.toFixed(1) ?? '—'}° (min @ 22°)`, M, M);

    // Hexagonal prism cross-section + ray trace
    const px = M + 150, py = M + 200, ps = 100;
    g.fillStyle = '#e8f0f6';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 - Math.PI / 6;
      const x = px + Math.cos(a) * ps, y = py + Math.sin(a) * ps;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1.5; g.stroke();
    // Mark the 60° apex (top-right face going clockwise to right face)
    g.fillStyle = theme.crimson; g.font = 'bold 12px serif'; g.textAlign = 'center';
    const aRX = px + Math.cos(-Math.PI / 6) * ps, aRY = py + Math.sin(-Math.PI / 6) * ps;
    g.fillText('60°', aRX + 14, aRY + 4);

    // Trace 5 wavelength rays through the apex (sym entry)
    const lams = [410, 470, 530, 590, 650];
    const yEntry = py;
    for (const lam of lams) {
      const n = nIce(lam);
      const d = deviationDeg(this.t, n);
      if (d === null) continue;
      const ti = this.t * Math.PI / 180;
      const tr = Math.asin(Math.sin(ti) / n);
      // Entry on left face
      const ex = px - ps * Math.cos(Math.PI / 6), ey = yEntry;
      // Exit on right face
      const exX = px + ps * Math.cos(Math.PI / 6), exY = yEntry;
      g.strokeStyle = wavelengthCss(lam); g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(M, yEntry - 30);
      g.lineTo(ex, ey);
      g.lineTo(exX, exY);
      // Exit direction tilted by d
      const outX = exX + 120 * Math.cos(d * Math.PI / 180);
      const outY = exY + 120 * Math.sin(d * Math.PI / 180);
      g.lineTo(outX, outY);
      g.stroke();
      void tr;
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('hexagonal ice column (cross-section)', px, py + ps + 24);

    // Deviation curve
    const cx = px + ps + 180, cy = M + 40, cw = w - cx - M, ch = 220;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('deviation δ vs entry θᵢ (530 nm)', cx + cw / 2, cy - 4);
    const X = (ti: number) => cx + (ti - 10) / 70 * cw;
    const Y = (dd: number) => cy + (1 - (dd - 20) / 25) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    let drew = false;
    for (let ti = 10; ti <= 80; ti += 1) {
      const d = deviationDeg(ti, nMid);
      if (d === null) continue;
      const x = X(ti), y = Y(d);
      if (!drew) { g.moveTo(x, y); drew = true; } else g.lineTo(x, y);
    }
    g.stroke();
    // Mark minimum
    g.strokeStyle = theme.inkAlpha(0.5); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(cx, Y(21.84)); g.lineTo(cx + cw, Y(21.84)); g.stroke(); g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'right';
    g.fillText('δmin = 21.84°', cx + cw - 4, Y(21.84) - 4);
    g.fillStyle = '#1a1a1a';
    if (dMid !== null) { g.beginPath(); g.arc(X(this.t), Y(dMid), 5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('10°', cx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('80°', cx + cw, cy + ch + 14);

    // Halo ring sketch
    const hx = cx + cw / 2, hy = cy + ch + 80, hr = 70;
    g.strokeStyle = '#ffd060'; g.lineWidth = 4;
    g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff0c0';
    g.beginPath(); g.arc(hx, hy, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('22° halo around sun/moon', hx, hy + hr + 18);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Sharp inner edge of the halo = sharp minimum-deviation cutoff. Outer edge fades because all θᵢ > θmin contribute.', M, h - M);
  }
}

new Halo();
