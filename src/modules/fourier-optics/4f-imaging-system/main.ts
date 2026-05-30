import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class FourF {
  private stage: CanvasStage;
  private f = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.f = hydrateNumber('f', 1);
    const s = document.getElementById('f') as EncSlider; s.value = this.f;
    s.addEventListener('input', (e) => { this.f = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('f', () => Math.round(this.f));
    document.addEventListener('reset-params', () => { this.f = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const labels = ['open (identity)', 'low-pass (blur)', 'high-pass (edges)', 'band-pass (texture)'];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Fourier-plane filter: ${labels[this.f - 1]}`, M, M);

    // Diagram: input | L1 | Fourier | L2 | image
    const cy = h / 2 - 30;
    const startX = M + 40;
    const span = w - 2 * M - 80;
    const stops = 5;
    const xs = Array.from({ length: stops }, (_, i) => startX + i * span / (stops - 1));

    // Optical axis
    g.strokeStyle = theme.inkAlpha(0.3); g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(M + 20, cy); g.lineTo(w - M - 20, cy); g.stroke(); g.setLineDash([]);

    // Input plane: cross-grating
    g.fillStyle = '#1a1a1a'; g.fillRect(xs[0] - 30, cy - 50, 60, 100);
    g.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      g.fillRect(xs[0] - 30 + 5, cy - 50 + 15 + (i + 2) * 17, 50, 6);
      g.fillRect(xs[0] - 30 + 5 + (i + 2) * 12, cy - 50 + 15, 6, 70);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(xs[0] - 30, cy - 50, 60, 100);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('input', xs[0], cy + 80);

    // Lens 1
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(xs[1], cy - 70); g.lineTo(xs[1], cy + 70); g.stroke();
    g.beginPath(); g.moveTo(xs[1] - 5, cy - 62); g.lineTo(xs[1], cy - 70); g.lineTo(xs[1] + 5, cy - 62); g.stroke();
    g.beginPath(); g.moveTo(xs[1] - 5, cy + 62); g.lineTo(xs[1], cy + 70); g.lineTo(xs[1] + 5, cy + 62); g.stroke();
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('L1 (FT)', xs[1], cy + 90);

    // Fourier plane: dot pattern + filter
    g.fillStyle = '#1a1a1a'; g.fillRect(xs[2] - 40, cy - 50, 80, 100);
    g.fillStyle = '#fff';
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const intensity = Math.exp(-(i * i + j * j) / 8);
      g.fillStyle = `rgba(255,255,255,${intensity})`;
      g.beginPath(); g.arc(xs[2] + i * 10, cy + j * 12, 3, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(xs[2] - 40, cy - 50, 80, 100);
    // Filter overlay
    g.globalAlpha = 0.7;
    if (this.f === 2) {
      // Low-pass: circular aperture
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.rect(xs[2] - 40, cy - 50, 80, 100); g.arc(xs[2], cy, 14, 0, Math.PI * 2, true); g.fill();
    } else if (this.f === 3) {
      // High-pass: centre stop
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.arc(xs[2], cy, 14, 0, Math.PI * 2); g.fill();
    } else if (this.f === 4) {
      // Band-pass: ring
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.rect(xs[2] - 40, cy - 50, 80, 100); g.arc(xs[2], cy, 22, 0, Math.PI * 2, true); g.fill();
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.arc(xs[2], cy, 8, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('Fourier plane', xs[2], cy + 90);

    // Lens 2
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(xs[3], cy - 70); g.lineTo(xs[3], cy + 70); g.stroke();
    g.beginPath(); g.moveTo(xs[3] - 5, cy - 62); g.lineTo(xs[3], cy - 70); g.lineTo(xs[3] + 5, cy - 62); g.stroke();
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('L2 (inv-FT)', xs[3], cy + 90);

    // Output plane: result depends on filter
    g.fillStyle = '#1a1a1a'; g.fillRect(xs[4] - 30, cy - 50, 60, 100);
    g.fillStyle = '#fff';
    if (this.f === 1) {
      // Identity - same pattern
      for (let i = -2; i <= 2; i++) {
        g.fillRect(xs[4] - 30 + 5, cy - 50 + 15 + (i + 2) * 17, 50, 6);
        g.fillRect(xs[4] - 30 + 5 + (i + 2) * 12, cy - 50 + 15, 6, 70);
      }
    } else if (this.f === 2) {
      // Low-pass - soft blocks
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        g.fillStyle = `rgba(255,255,255,${0.4})`;
        g.fillRect(xs[4] - 30 + 5 + (i + 2) * 11, cy - 50 + 5 + (j + 2) * 18, 18, 12);
      }
    } else if (this.f === 3) {
      // High-pass - edges only
      g.strokeStyle = '#fff'; g.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(xs[4] - 30 + 5, cy - 50 + 15 + (i + 2) * 17); g.lineTo(xs[4] - 30 + 5 + 50, cy - 50 + 15 + (i + 2) * 17); g.stroke();
        g.beginPath(); g.moveTo(xs[4] - 30 + 5 + (i + 2) * 12, cy - 50 + 15); g.lineTo(xs[4] - 30 + 5 + (i + 2) * 12, cy - 50 + 15 + 70); g.stroke();
      }
    } else if (this.f === 4) {
      // Band-pass - mid-frequency artefacts
      for (let i = 0; i < 24; i++) {
        const x = xs[4] - 28 + (i % 6) * 9 + (Math.floor(i / 6) % 2) * 4;
        const y = cy - 48 + Math.floor(i / 6) * 22;
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.fillRect(x, y, 4, 4);
      }
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(xs[4] - 30, cy - 50, 60, 100);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('output', xs[4], cy + 80);

    // Distance labels
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
      g.beginPath(); g.moveTo(xs[i], cy - 100); g.lineTo(xs[i + 1], cy - 100); g.stroke();
      g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('f', (xs[i] + xs[i + 1]) / 2, cy - 105);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Phase-contrast microscopy (Zernike 1953 Nobel) uses a quarter-wave plate in the Fourier plane to convert phase → amplitude.', M, h - M);
  }
}

new FourF();
