import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

function egCdSe(sizeNm: number): number {
  // Bulk Eg=1.74 eV; effective-mass approx confinement ~1 eV at 2 nm
  return 1.74 + 1.0 * Math.pow(2 / Math.max(2, sizeNm), 2);
}

class CdSeRed {
  private stage: CanvasStage;
  private size = 5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.size = hydrateNumber('size', 5);
    const s = document.getElementById('size') as EncSlider; s.value = this.size;
    s.addEventListener('input', (e) => { this.size = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('size', () => Math.round(this.size));
    document.addEventListener('reset-params', () => { this.size = 5; s.value = 5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const E = egCdSe(this.size);
    const emLam = 1240 / E + 20; // Stokes-shifted fluorescence
    const colour = wavelengthCss(emLam);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`CdSe dot ${this.size} nm · Eg = ${E.toFixed(2)} eV · fluorescence ≈ ${emLam.toFixed(0)} nm`, M, M);

    // Series of QDs across the canvas
    const sy = M + 50, sh = 200;
    for (let s = 2; s <= 10; s++) {
      const Es = egCdSe(s);
      const lam = 1240 / Es + 20;
      const x = M + ((s - 2) / 8) * (w - 2 * M - 60) + 30;
      const r = 8 + (s - 2) * 4;
      g.fillStyle = wavelengthCss(lam);
      g.beginPath(); g.arc(x, sy + sh / 2, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = s === this.size ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = s === this.size ? 2 : 1; g.stroke();
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${s} nm`, x, sy + sh / 2 + r + 16);
    }

    // Active large swatch
    g.fillStyle = colour;
    g.fillRect(M, sy + sh + 30, w - 2 * M, 50);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, sy + sh + 30, w - 2 * M, 50);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('active dot fluorescence colour', M + (w - 2 * M) / 2, sy + sh + 100);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Quantum dots are the basis of QLED/QD-OLED TV colour gamut — narrow Gaussian emission widths give wide Rec.2020 coverage.', M, h - M);
  }
}

new CdSeRed();
