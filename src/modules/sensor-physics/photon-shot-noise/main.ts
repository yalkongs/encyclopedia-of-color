import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Knuth Poisson for small mean; Gaussian approximation for large
function poisson(mean: number): number {
  if (mean > 30) {
    // Box-Muller normal approximation
    const u1 = Math.random() || 1e-9, u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * z));
  }
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

class ShotNoise {
  private stage: CanvasStage;
  private logN = 40; // slider 0..100 → log10 mean 0.5..4

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.logN = hydrateNumber('logN', 40);
    const s = document.getElementById('logN') as EncSlider;
    s.value = this.logN;
    s.addEventListener('input', (e) => { this.logN = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('logN', () => Math.round(this.logN));
    document.addEventListener('reset-params', () => { this.logN = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0e0e12'; ctx.fillRect(0, 0, w, h);
    const N = Math.round(Math.pow(10, 0.5 + (this.logN / 100) * 3.5));   // 3..3162
    const snr = Math.sqrt(N);

    // single noisy patch — a flat target rendered with Poisson noise per pixel
    const px0 = 40, py0 = 56, pw = w - 80, ph = h - 170, cell = 3;
    for (let py = 0; py < ph; py += cell) {
      for (let px = 0; px < pw; px += cell) {
        const k = poisson(N);
        const v = Math.max(0, Math.min(255, (k / N) * 160));     // mean → ~160 grey
        ctx.fillStyle = `rgb(${v | 0},${v | 0},${(v + 4) | 0})`;
        ctx.fillRect(px0 + px, py0 + py, cell + 0.5, cell + 0.5);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(px0, py0, pw, ph);

    // readout strip
    const ry = py0 + ph + 18;
    ctx.fillStyle = '#e6e3da'; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`mean photons per pixel  N = ${N}`, px0, ry);
    ctx.fillText(`noise σ ≈ √N = ${Math.sqrt(N).toFixed(1)}`, px0, ry + 22);
    ctx.fillStyle = snr > 30 ? '#2e7d4f' : snr > 10 ? '#c79b2d' : '#9b2828';
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillText(`SNR  =  √N  ≈  ${snr.toFixed(1)}`, px0 + pw - 280, ry + 12);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(N < 30
      ? 'starlight — the Poisson grain is louder than the signal'
      : N < 300 ? 'dim — clear grain across the patch'
      : N < 1000 ? 'indoor — grain still visible, fine detail at risk'
      : 'daylight — smooth; SNR is high enough that the noise vanishes into the texture', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ShotNoise());
