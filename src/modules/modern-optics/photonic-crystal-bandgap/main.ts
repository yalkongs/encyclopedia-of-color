import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N_H = 2.35; // TiO2
const N_L = 1.46; // SiO2
const LAM0 = 550;  // nm centre

function reflectance(lam: number, N: number): number {
  // Bragg mirror reflectance (normal incidence, ideal lossless QW stack)
  // R = ((1 - (nH/nL)^(2N))/(1 + (nH/nL)^(2N)))^2 at λ = λ₀;
  // Use envelope formula across λ via transfer matrix for accuracy.
  // For demo: approximate R(λ) with stopband shape
  const u = (lam - LAM0) / LAM0;
  const ratio = Math.pow(N_H / N_L, 2 * N);
  const Rcentre = Math.pow((ratio - 1) / (ratio + 1), 2);
  // Sinc-like envelope outside gap; gap half-width ≈ (2λ₀/π) * arcsin((nH-nL)/(nH+nL))
  const gapHalf = (2 / Math.PI) * Math.asin((N_H - N_L) / (N_H + N_L));
  if (Math.abs(u) < gapHalf) return Rcentre;
  // Outside: oscillating sinc²
  const x = N * Math.PI * (Math.abs(u) - gapHalf) * 1.5;
  return Rcentre * Math.pow(Math.sin(x) / Math.max(x, 0.01), 2);
}

class PhC {
  private stage: CanvasStage;
  private n0 = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n0 = hydrateNumber('n', 10);
    const s = document.getElementById('n') as EncSlider; s.value = this.n0;
    s.addEventListener('input', (e) => { this.n0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n0));
    document.addEventListener('reset-params', () => { this.n0 = 10; s.value = 10; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const Rpeak = reflectance(LAM0, this.n0);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`N = ${this.n0} pairs · TiO₂/SiO₂ (nH=${N_H}, nL=${N_L}) · centre λ₀=${LAM0} nm · R_peak=${Rpeak.toFixed(4)}`, M, M);

    // Stack sketch (left)
    const sx = M + 80, sy = M + 50, sw = 240, sh = 220;
    const layerH = sh / (this.n0 * 2);
    for (let i = 0; i < this.n0 * 2; i++) {
      const isH = (i % 2 === 0);
      g.fillStyle = isH ? '#3a76a8' : '#e0e8ee';
      g.fillRect(sx, sy + i * layerH, sw, layerH - 0.5);
    }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`Bragg stack (${this.n0} pairs)`, sx + sw / 2, sy + sh + 16);
    // Incident + reflected rays
    g.strokeStyle = '#c2382c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(M, sy + 20); g.lineTo(sx, sy + 60); g.stroke();
    g.beginPath(); g.moveTo(sx, sy + 60); g.lineTo(M, sy + 100); g.stroke();
    g.beginPath(); g.moveTo(M + 10, sy + 92); g.lineTo(M, sy + 100); g.lineTo(M + 4, sy + 88); g.stroke();
    g.fillStyle = '#c2382c'; g.font = '11px serif'; g.textAlign = 'right';
    g.fillText('in', M - 4, sy + 24);
    g.fillText('R', M - 4, sy + 110);

    // Reflectance spectrum (right)
    const px = sx + sw + 50, py = sy, pw = w - px - M, ph = sh;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('reflectance R(λ)', px + pw / 2, py - 4);
    const X = (lam: number) => px + ((lam - 380) / 320) * pw;
    const Y = (R: number) => py + (1 - R) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let lam = 380; lam <= 700; lam += 2) {
      const R = reflectance(lam, this.n0);
      const x0 = X(lam), y0 = Y(R);
      if (lam === 380) g.moveTo(x0, y0); else g.lineTo(x0, y0);
    }
    g.stroke();
    // Visible band underlay
    for (let lam = 380; lam < 700; lam += 4) {
      g.fillStyle = `hsl(${300 - (lam - 380) * (300 / 320)} 80% 50%)`;
      g.fillRect(X(lam), py + ph, 4, 10);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('380 nm', px, py + ph + 24);
    g.textAlign = 'right'; g.fillText('700 nm', px + pw, py + ph + 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same physics underlies dichroic mirrors, anti-reflection coatings, opal-gemstone iridescence, and Morpho butterfly wings.', M, h - M);
  }
}

new PhC();
