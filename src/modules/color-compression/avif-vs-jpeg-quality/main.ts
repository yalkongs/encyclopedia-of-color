import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class AvifVsJpeg {
  private stage: CanvasStage;
  private q = 70;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.q = hydrateNumber('q', 70);
    const s = document.getElementById('q') as EncSlider; s.value = this.q;
    s.addEventListener('input', (e) => { this.q = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('q', () => Math.round(this.q));
    document.addEventListener('reset-params', () => { this.q = 70; s.value = 70; this.draw(); notifyStateChange(); });
  }

  /** Rough rate-quality model: bits-per-pixel as a function of quality factor (0..100). */
  private bppJPEG(q: number): number {
    // Empirical curve: 0.05 bpp at q=10, 0.3 at q=50, 1.0 at q=80, 3.5 at q=95, 8 at q=100
    return 0.04 * Math.pow(1.062, q);
  }
  private bppAVIF(q: number): number {
    return 0.5 * this.bppJPEG(q); // typical 40-60% savings
  }

  private psnrJPEG(q: number): number {
    // PSNR-like asymptote
    return 24 + 16 * (1 - Math.exp(-q / 30));
  }
  private psnrAVIF(q: number): number {
    return this.psnrJPEG(q) + 2.5; // ~2.5 dB better at equivalent bitrate
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const bpjpeg = this.bppJPEG(this.q);
    const bpavif = this.bppAVIF(this.q);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`q = ${this.q} · JPEG ≈ ${bpjpeg.toFixed(2)} bpp · AVIF ≈ ${bpavif.toFixed(2)} bpp · ratio = ${(bpjpeg / bpavif).toFixed(2)}×`, M, M);

    // BPP curves (left)
    const cx = M, cy = M + 40, cw = (w - 2 * M) / 2 - 20, ch = h - 2 * M - 80;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('bits per pixel vs quality', cx + cw / 2, cy - 4);
    const X = (q: number) => cx + ((q - 10) / 90) * cw;
    const maxBpp = 8;
    const Y = (b: number) => cy + (1 - Math.min(1, b / maxBpp)) * ch;
    // JPEG (red)
    g.strokeStyle = '#c2382c'; g.lineWidth = 2;
    g.beginPath();
    for (let q = 10; q <= 100; q += 1) {
      const x0 = X(q), y0 = Y(this.bppJPEG(q));
      if (q === 10) g.moveTo(x0, y0); else g.lineTo(x0, y0);
    }
    g.stroke();
    // AVIF (blue)
    g.strokeStyle = '#1f3a8a'; g.lineWidth = 2;
    g.beginPath();
    for (let q = 10; q <= 100; q += 1) {
      const x0 = X(q), y0 = Y(this.bppAVIF(q));
      if (q === 10) g.moveTo(x0, y0); else g.lineTo(x0, y0);
    }
    g.stroke();
    // Current marker
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.q), Y(bpjpeg), 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(X(this.q), Y(bpavif), 4, 0, Math.PI * 2); g.fill();
    // Labels
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.textAlign = 'left'; g.fillText('q=10', cx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('q=100', cx + cw, cy + ch + 14);
    g.fillStyle = '#c2382c'; g.fillText('JPEG', cx + cw - 50, cy + 20);
    g.fillStyle = '#1f3a8a'; g.fillText('AVIF', cx + cw - 50, cy + 40);

    // PSNR-vs-bpp curve (right)
    const rx = cx + cw + 40;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(rx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('PSNR-like quality vs bpp (BD-rate)', rx + cw / 2, cy - 4);
    const X2 = (b: number) => rx + (Math.min(1, b / maxBpp)) * cw;
    const Y2 = (p: number) => cy + (1 - (p - 20) / 25) * ch;
    g.strokeStyle = '#c2382c'; g.lineWidth = 2; g.beginPath();
    for (let q = 10; q <= 100; q += 1) {
      const bp = this.bppJPEG(q), p = this.psnrJPEG(q);
      if (q === 10) g.moveTo(X2(bp), Y2(p)); else g.lineTo(X2(bp), Y2(p));
    }
    g.stroke();
    g.strokeStyle = '#1f3a8a'; g.lineWidth = 2; g.beginPath();
    for (let q = 10; q <= 100; q += 1) {
      const bp = this.bppAVIF(q), p = this.psnrAVIF(q);
      if (q === 10) g.moveTo(X2(bp), Y2(p)); else g.lineTo(X2(bp), Y2(p));
    }
    g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.textAlign = 'left'; g.fillText('0 bpp', rx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText(`${maxBpp} bpp`, rx + cw, cy + ch + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Numbers are illustrative — BD-rate testing on real images shows AVIF ~40-50% smaller than JPEG at equivalent quality.', M, h - M);
  }
}

new AvifVsJpeg();
