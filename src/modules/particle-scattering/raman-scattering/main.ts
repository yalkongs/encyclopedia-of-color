import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const KT_CM_300 = 208.5; // k_B·T/(hc) at 300 K, in cm⁻¹

class Raman {
  private stage: CanvasStage;
  private shift = 1000; // cm⁻¹
  private T = 300;      // K
  private laser = 532;  // nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.shift = hydrateNumber('shift', 1000);
    this.T = hydrateNumber('T', 300);
    this.laser = hydrateNumber('laser', 532);
    (document.getElementById('shift') as EncSlider).value = this.shift;
    (document.getElementById('T') as EncSlider).value = this.T;
    (document.getElementById('laser') as EncSlider).value = this.laser;
    registerStateParam('shift', () => this.shift);
    registerStateParam('T', () => this.T);
    registerStateParam('laser', () => this.laser);
    for (const id of ['shift', 'T', 'laser']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'shift') this.shift = v;
        else if (id === 'T') this.T = v;
        else this.laser = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.shift = 1000; this.T = 300; this.laser = 532;
      (document.getElementById('shift') as EncSlider).value = 1000;
      (document.getElementById('T') as EncSlider).value = 300;
      (document.getElementById('laser') as EncSlider).value = 532;
      this.draw(); notifyStateChange();
    });
  }

  // anti-Stokes / Stokes intensity ratio.
  private ratio(): number {
    const nu0 = 1e7 / this.laser;          // laser wavenumber cm⁻¹
    const freqFactor = Math.pow((nu0 + this.shift) / (nu0 - this.shift), 4);
    const kT = KT_CM_300 * (this.T / 300);
    return freqFactor * Math.exp(-this.shift / kT);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 50;
    const plotX = pad + 6, plotY = pad - 6, plotW = w - pad * 2, plotH = h - pad * 2.4;
    // X-axis: Raman shift from −maxShift (anti-Stokes) to +maxShift (Stokes).
    const maxShift = 3400;
    const xOf = (s: number) => plotX + ((s + maxShift) / (2 * maxShift)) * plotW;
    const yOf = (I: number) => plotY + (1 - I) * plotH;

    // Axes + baseline.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    const ratio = this.ratio();
    // Stokes line (positive shift) intensity 1; anti-Stokes = ratio.
    const drawLine = (s: number, I: number, col: string, label: string) => {
      const x = xOf(s);
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, plotY + plotH); ctx.lineTo(x, yOf(I)); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(label, x - 18, yOf(I) - 6);
    };

    // Rayleigh line (huge, clipped) at shift 0.
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xOf(0), plotY + plotH); ctx.lineTo(xOf(0), plotY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Rayleigh', xOf(0) - 22, plotY + 12);

    drawLine(this.shift, 1.0, theme.crimson, 'Stokes');
    drawLine(-this.shift, ratio, theme.slate, 'anti-Stokes');
    // Second-order Stokes (overtone) faint.
    if (2 * this.shift < maxShift) drawLine(2 * this.shift, 0.18, theme.crimsonAlpha(0.5), '2×');

    // X ticks.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let s = -3000; s <= 3000; s += 1000) ctx.fillText(`${s}`, xOf(s) - 12, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('Raman shift (cm⁻¹)   ← anti-Stokes | Stokes →', plotX + plotW * 0.25, plotY + plotH + 28);

    // Readouts.
    const stokesNm = 1e7 / (1e7 / this.laser - this.shift);
    const antiNm = 1e7 / (1e7 / this.laser + this.shift);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`mode Δν = ${this.shift} cm⁻¹   T = ${this.T} K   laser ${this.laser} nm`, plotX + 4, plotY + 6);
    ctx.fillText(`Stokes at ${stokesNm.toFixed(0)} nm   anti-Stokes at ${antiNm.toFixed(0)} nm`, plotX + 4, plotY + 24);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`I(anti-Stokes)/I(Stokes) = ${(ratio * 100).toFixed(1)}%`, plotX + 4, plotY + 44);
  }
}
window.addEventListener('DOMContentLoaded', () => new Raman());
