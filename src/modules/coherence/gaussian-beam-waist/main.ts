import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAMBDA_UM = 0.633;

class Gaussian {
  private stage: CanvasStage;
  private w0 = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.w0 = hydrateNumber('w', 40);
    const s = document.getElementById('w') as EncSlider; s.value = this.w0;
    s.addEventListener('input', (e) => { this.w0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('w', () => Math.round(this.w0));
    document.addEventListener('reset-params', () => { this.w0 = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const zR_um = Math.PI * this.w0 * this.w0 / LAMBDA_UM;
    const zR_mm = zR_um / 1000;
    const divergence_mrad = (LAMBDA_UM / (Math.PI * this.w0)) * 1000;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`w₀=${this.w0} μm · λ=633 nm · Rayleigh range z_R = ${zR_mm.toFixed(2)} mm · divergence θ = ${divergence_mrad.toFixed(2)} mrad`, M, M);

    // Beam profile in real-space (left)
    const px = M, py = M + 40, pw = w - 2 * M, ph = h - 2 * M - 100;
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    const cy = py + ph / 2;
    g.strokeStyle = theme.inkAlpha(0.3); g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(px, cy); g.lineTo(px + pw, cy); g.stroke(); g.setLineDash([]);
    // x-axis: z spans ±5 z_R
    const zRange_um = 5 * zR_um;
    const X = (z_um: number) => px + ((z_um + zRange_um) / (2 * zRange_um)) * pw;
    // Scale y axis so w0 occupies sensible fraction
    const yScale_um = 6 * this.w0;
    const Y = (w_um: number) => cy - (w_um / yScale_um) * (ph / 2);

    // Beam envelope (top and bottom curves)
    g.strokeStyle = '#ee5040'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const z = -zRange_um + (i / 200) * 2 * zRange_um;
      const wz = this.w0 * Math.sqrt(1 + (z / zR_um) ** 2);
      const x = X(z), y = Y(wz);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const z = -zRange_um + (i / 200) * 2 * zRange_um;
      const wz = this.w0 * Math.sqrt(1 + (z / zR_um) ** 2);
      const x = X(z), y = Y(-wz);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    // Fill region with Gaussian intensity
    for (let i = 0; i <= 60; i++) {
      const z = -zRange_um + (i / 60) * 2 * zRange_um;
      const wz = this.w0 * Math.sqrt(1 + (z / zR_um) ** 2);
      const w0r = X(z + zRange_um / 60) - X(z);
      // Gaussian column
      for (let j = -25; j <= 25; j++) {
        const yLocal = (j / 25) * yScale_um / 2;
        const I = Math.exp(-2 * yLocal * yLocal / (wz * wz));
        const alpha = Math.min(0.6, I * 0.6);
        g.fillStyle = `rgba(190,40,40,${alpha})`;
        g.fillRect(X(z), Y(yLocal), Math.max(1, w0r), Math.abs(Y(yLocal + yScale_um / 50) - Y(yLocal)) + 1);
      }
    }

    // Mark waist + Rayleigh range
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(0), Y(this.w0)); g.lineTo(X(0), Y(-this.w0)); g.stroke();
    g.fillStyle = '#1a1a1a'; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText(`w₀ = ${this.w0} μm`, X(0), cy + 14);
    g.strokeStyle = '#3a76a8'; g.lineWidth = 1; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(X(zR_um), py); g.lineTo(X(zR_um), py + ph); g.stroke();
    g.beginPath(); g.moveTo(X(-zR_um), py); g.lineTo(X(-zR_um), py + ph); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#3a76a8'; g.fillText(`+z_R`, X(zR_um), py + 12);
    g.fillText(`−z_R`, X(-zR_um), py + 12);

    // Far-field cone
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([2, 3]);
    g.beginPath();
    const farW = this.w0 * Math.sqrt(1 + (zRange_um / zR_um) ** 2);
    g.moveTo(X(0), cy); g.lineTo(X(zRange_um), Y(farW)); g.stroke();
    g.beginPath(); g.moveTo(X(0), cy); g.lineTo(X(zRange_um), Y(-farW)); g.stroke();
    g.beginPath(); g.moveTo(X(0), cy); g.lineTo(X(-zRange_um), Y(farW)); g.stroke();
    g.beginPath(); g.moveTo(X(0), cy); g.lineTo(X(-zRange_um), Y(-farW)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`far-field θ = ${divergence_mrad.toFixed(2)} mrad`, X(zRange_um * 0.7), Y(farW * 0.7));

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Tighter focus → faster divergence. M² > 1 for real beams (HeNe ≈ 1.05; multimode fibre laser ≈ 30).', M, h - M);
  }
}

new Gaussian();
