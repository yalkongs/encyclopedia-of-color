import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAMBDA_M = 575e-9;
const THETA_MAS = 47; // Betelgeuse angular diameter (mas)

function besselJ1(x: number): number {
  if (x === 0) return 0;
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const num = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * -30.16036606)))));
    const den = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    return num / den;
  }
  return 0;
}

function visibility(B: number): number {
  // Uniform disk: V(B) = |2 J1(πθB/λ) / (πθB/λ)|
  const theta = THETA_MAS * 1e-3 * 4.848e-6; // radians
  const x = Math.PI * theta * B / LAMBDA_M;
  if (x < 1e-6) return 1;
  return Math.abs(2 * besselJ1(x) / x);
}

class Stellar {
  private stage: CanvasStage;
  private b = 6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.b = hydrateNumber('b', 6);
    const s = document.getElementById('b') as EncSlider; s.value = this.b;
    s.addEventListener('input', (e) => { this.b = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('b', () => this.b.toFixed(1));
    document.addEventListener('reset-params', () => { this.b = 6; s.value = 6; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const V = visibility(this.b);
    const theta = THETA_MAS * 1e-3 * 4.848e-6;
    const firstZero = 1.22 * LAMBDA_M / theta;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`B = ${this.b.toFixed(1)} m · V = ${V.toFixed(3)} · first zero at B = ${firstZero.toFixed(2)} m (θ=${THETA_MAS} mas, Betelgeuse)`, M, M);

    // Schematic: two ground mirrors, beams to central combiner
    const cy = h / 2;
    const cx = M + 240;
    g.fillStyle = '#1a1a1a';
    // Two mirrors
    const baseW = Math.min(this.b * 8, w - 2 * M - 80);
    g.fillRect(cx - baseW / 2 - 5, cy + 70, 10, 30);
    g.fillRect(cx + baseW / 2 - 5, cy + 70, 10, 30);
    // Star (top right)
    g.fillStyle = '#fff8b0'; g.beginPath(); g.arc(w - M - 60, M + 60, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c8a020'; g.lineWidth = 2; g.stroke();
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('star (Betelgeuse)', w - M - 60, M + 96);

    // Starlight rays to both mirrors
    g.strokeStyle = '#c8a020'; g.lineWidth = 1.5; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(w - M - 60, M + 76); g.lineTo(cx - baseW / 2, cy + 70); g.stroke();
    g.beginPath(); g.moveTo(w - M - 60, M + 76); g.lineTo(cx + baseW / 2, cy + 70); g.stroke();
    g.setLineDash([]);
    // From mirrors to combiner (centre)
    g.strokeStyle = '#3a76a8'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx - baseW / 2, cy + 70); g.lineTo(cx, cy + 130); g.stroke();
    g.beginPath(); g.moveTo(cx + baseW / 2, cy + 70); g.lineTo(cx, cy + 130); g.stroke();
    // Combiner
    g.fillStyle = '#1a1a1a'; g.fillRect(cx - 18, cy + 130, 36, 16);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('combiner', cx, cy + 160);
    // Fringe pattern
    const fX = cx - 70, fY = cy + 180, fW = 140, fH = 28;
    for (let i = 0; i < fW; i++) {
      const v = 0.5 + 0.5 * V * Math.cos(2 * Math.PI * i / 14);
      const ch = Math.round(v * 255);
      g.fillStyle = `rgb(${ch},${ch},${ch})`;
      g.fillRect(fX + i, fY, 1, fH);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(fX, fY, fW, fH);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`fringes (visibility V = ${V.toFixed(2)})`, cx, fY + fH + 16);

    // Baseline label
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - baseW / 2, cy + 110); g.lineTo(cx + baseW / 2, cy + 110); g.stroke();
    g.fillStyle = theme.ink; g.font = '11px serif';
    g.fillText(`B = ${this.b.toFixed(1)} m`, cx, cy + 124);

    // V(B) curve (right)
    const px = w - M - 280, py = M + 40, pw = 240, ph = 160;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('V(B) for 47 mas uniform disk', px + pw / 2, py - 4);
    const X = (bb: number) => px + (bb / 30) * pw;
    const Y = (vv: number) => py + (1 - vv) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let bb = 0; bb <= 30; bb += 0.2) {
      const x0 = X(bb), y0 = Y(visibility(bb));
      if (bb === 0) g.moveTo(x0, y0); else g.lineTo(x0, y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.b), Y(V), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
    g.textAlign = 'left'; g.fillText('1 m', px, py + ph + 14);
    g.textAlign = 'right'; g.fillText('30 m', px + pw, py + ph + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Michelson + Pease (1921): Betelgeuse θ = 47 mas with B = 6 m baseline at Mt Wilson — first direct stellar diameter measurement.', M, h - M);
  }
}

new Stellar();
