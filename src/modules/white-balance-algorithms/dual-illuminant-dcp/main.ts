import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Canon 5D Mark III DCP — ColorMatrix1 (A, 2856K) and ColorMatrix2 (D65, 6504K)
// Source: dcraw / Adobe DNG Converter shipped profile (XYZ → camera native RGB)
const M_A = [
  [ 0.6722, -0.0635, -0.0963],
  [-0.4287,  1.2460,  0.2028],
  [-0.0908,  0.2162,  0.5668],
];
const M_D65 = [
  [ 0.6347, -0.0479, -0.0972],
  [-0.8297,  1.5954,  0.2480],
  [-0.1968,  0.2131,  0.7649],
];

const T_A = 2856, T_D65 = 6504;
const MIRED = (T: number) => 1e6 / T;

class DualDCP {
  private stage: CanvasStage;
  private cct = 5000;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cct = hydrateNumber('cct', 5000);
    const s = document.getElementById('cct') as EncSlider;
    s.value = this.cct;
    s.addEventListener('input', (e) => { this.cct = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cct', () => Math.round(this.cct));
    document.addEventListener('reset-params', () => { this.cct = 5000; s.value = 5000; this.draw(); notifyStateChange(); });
  }

  private interpolatedMatrix(): { M: number[][]; w: number } {
    const mScene = MIRED(this.cct);
    const mA = MIRED(T_A), mD65 = MIRED(T_D65);
    let w = (mScene - mD65) / (mA - mD65);
    w = Math.max(0, Math.min(1, w));
    const M: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        M[i][j] = w * M_A[i][j] + (1 - w) * M_D65[i][j];
    return { M, w };
  }

  private draw() {
    const { w: W, h: H } = this.stage.logicalSize;
    if (W === 0 || H === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, W, H);

    const M = 36;
    const { M: Mat, w } = this.interpolatedMatrix();
    const mScene = MIRED(this.cct);
    const mA = MIRED(T_A);
    const mD65 = MIRED(T_D65);

    // Title
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText('Canon 5D Mark III · DNG dual-illuminant profile', M, M);

    // Mired axis bar
    const axY = M + 50;
    const axX0 = M, axX1 = W - M;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.beginPath(); g.moveTo(axX0, axY); g.lineTo(axX1, axY); g.stroke();
    // Map mired 100..500 → axis
    const mMin = 100, mMax = 500;
    const X = (m: number) => axX0 + ((m - mMin) / (mMax - mMin)) * (axX1 - axX0);
    // Ticks at 100, 154 (D65), 200, 300, 350 (A), 400, 500
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const m of [100, 200, 300, 400, 500]) {
      g.beginPath(); g.moveTo(X(m), axY - 4); g.lineTo(X(m), axY + 4); g.stroke();
      g.fillText(`${m}`, X(m), axY + 18);
    }
    g.textAlign = 'center';
    // Anchor points
    g.fillStyle = theme.crimson;
    g.beginPath(); g.arc(X(mD65), axY, 6, 0, Math.PI * 2); g.fill();
    g.fillText('M_D65 · 6504K · 154 mired', X(mD65), axY - 14);
    g.beginPath(); g.arc(X(mA), axY, 6, 0, Math.PI * 2); g.fill();
    g.fillText('M_A · 2856K · 350 mired', X(mA), axY - 14);
    // Scene marker
    g.fillStyle = theme.ink;
    g.beginPath(); g.arc(X(mScene), axY, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.paperBg; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText(`scene ${this.cct}K · ${mScene.toFixed(0)} mired`, X(mScene), axY + 34);

    // Three matrices side by side
    const matY = axY + 70;
    const colW = (W - 2 * M - 40) / 3;
    this.drawMatrix(g, 'ColorMatrix1 (A)', M_A, M, matY, colW);
    this.drawMatrix(g, `Interpolated (w=${w.toFixed(2)})`, Mat, M + colW + 20, matY, colW, theme.crimson);
    this.drawMatrix(g, 'ColorMatrix2 (D65)', M_D65, M + 2 * (colW + 20), matY, colW);

    // Formula readout below
    const fy = matY + 170;
    g.fillStyle = theme.inkAlpha(0.85); g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(`w = (m_scene − m_D65) / (m_A − m_D65)  =  (${mScene.toFixed(0)} − 154) / (350 − 154)  =  ${w.toFixed(3)}`, M, fy);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('clamped to [0,1] — below 2856K stays pure M_A, above 6504K stays pure M_D65', M, fy + 18);

    // Edge regions
    if (this.cct <= T_A) {
      g.fillStyle = theme.gold; g.fillText('current CCT is at or below the A anchor — matrix is identical to M_A', M, fy + 40);
    } else if (this.cct >= T_D65) {
      g.fillStyle = theme.gold; g.fillText('current CCT is at or above the D65 anchor — matrix is identical to M_D65', M, fy + 40);
    } else {
      g.fillStyle = theme.inkAlpha(0.6); g.fillText('inside interpolation range — every cell is the weighted blend of the two anchors', M, fy + 40);
    }
  }

  private drawMatrix(g: CanvasRenderingContext2D, label: string, m: number[][], x: number, y: number, cw: number, accent?: string) {
    g.fillStyle = accent ?? theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText(label, x + cw / 2, y);
    const ry = y + 12;
    const cellH = 26;
    const cellW = cw / 3;
    g.strokeStyle = accent ?? theme.inkAlpha(0.6); g.lineWidth = 1;
    g.strokeRect(x, ry, cw, cellH * 3);
    for (let i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(x, ry + i * cellH); g.lineTo(x + cw, ry + i * cellH); g.stroke();
      g.beginPath(); g.moveTo(x + i * cellW, ry); g.lineTo(x + i * cellW, ry + cellH * 3); g.stroke();
    }
    g.fillStyle = theme.ink; g.font = '12px monospace'; g.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const v = m[i][j];
        const s = (v >= 0 ? ' ' : '') + v.toFixed(3);
        g.fillText(s, x + (j + 0.5) * cellW, ry + i * cellH + 18);
      }
    }
  }
}

new DualDCP();
