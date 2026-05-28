import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function sinc(x: number): number {
  if (Math.abs(x) < 1e-9) return 1;
  return Math.sin(x) / x;
}

class SHG {
  private stage: CanvasStage;
  private I = 60;    // input intensity (arb)
  private L = 10;    // crystal length mm
  private dk = 0;    // phase mismatch Δk·L

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.I = hydrateNumber('I', 60);
    this.L = hydrateNumber('L', 10);
    this.dk = hydrateNumber('dk', 0);
    (document.getElementById('I') as EncSlider).value = this.I;
    (document.getElementById('L') as EncSlider).value = this.L;
    (document.getElementById('dk') as EncSlider).value = this.dk;
    registerStateParam('I', () => this.I);
    registerStateParam('L', () => this.L);
    registerStateParam('dk', () => this.dk);
    for (const id of ['I', 'L', 'dk']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'I') this.I = v;
        else if (id === 'L') this.L = v;
        else this.dk = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.I = 60; this.L = 10; this.dk = 0;
      (document.getElementById('I') as EncSlider).value = 60;
      (document.getElementById('L') as EncSlider).value = 10;
      (document.getElementById('dk') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  // Conversion efficiency (0..~1), capped for depletion.
  private efficiency(): number {
    const phaseMatch = sinc(this.dk / 2) ** 2;
    const raw = 2.2e-5 * (this.I * this.I) * (this.L * this.L) * phaseMatch;
    return Math.min(0.95, raw);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const eta = this.efficiency();

    // --- Crystal + beams (top). ---
    const cy = h * 0.22, x0 = w * 0.14, x1 = w * 0.62;
    const crysX0 = w * 0.30, crysX1 = w * 0.46;
    // Crystal block.
    ctx.fillStyle = 'rgba(120,150,200,0.16)';
    ctx.fillRect(crysX0, cy - 26, crysX1 - crysX0, 52);
    ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 1.2;
    ctx.strokeRect(crysX0, cy - 26, crysX1 - crysX0, 52);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('χ² crystal', (crysX0 + crysX1) / 2 - 24, cy + 42);

    // Fundamental (1064 nm IR — deep red), dims by (1-η) after crystal.
    ctx.strokeStyle = 'rgba(150,30,30,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(crysX1, cy); ctx.stroke();
    ctx.strokeStyle = `rgba(150,30,30,${0.9 * (1 - eta)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(crysX1, cy); ctx.lineTo(x1, cy); ctx.stroke();
    ctx.fillStyle = '#962020'; ctx.fillText('1064 nm (ω)', x0, cy - 12);

    // Second harmonic (532 nm green), brightness ∝ η, emerges from crystal.
    if (eta > 0.001) {
      ctx.strokeStyle = `rgba(40,200,90,${Math.min(1, 0.3 + eta)})`; ctx.lineWidth = 2 + 5 * eta;
      ctx.beginPath(); ctx.moveTo(crysX1, cy + 8); ctx.lineTo(x1, cy + 8); ctx.stroke();
      ctx.fillStyle = '#1f9a4a'; ctx.fillText('532 nm (2ω)', x1 - 70, cy + 26);
    }

    // --- sinc² phase-matching curve (bottom). ---
    const plotX = w * 0.12, plotY = h * 0.46, plotW = w * 0.76, plotH = h * 0.34;
    const dkMax = 12;
    const xOf = (d: number) => plotX + ((d + dkMax) / (2 * dkMax)) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const d = -dkMax + (2 * dkMax) * (i / 400);
      const px = xOf(d), py = yOf(sinc(d / 2) ** 2);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current mismatch marker.
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(xOf(this.dk), yOf(sinc(this.dk / 2) ** 2), 4.5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let d = -12; d <= 12; d += 6) ctx.fillText(`${d}`, xOf(d) - 6, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('phase mismatch Δk·L', plotX + plotW * 0.36, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 18, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('phase-match factor', -44, 0); ctx.restore();

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`intensity = ${this.I}   L = ${this.L} mm   Δk·L = ${this.dk.toFixed(1)}`, 16, 28);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    const pm = Math.abs(this.dk) < 0.5 ? 'phase-matched' : 'off phase-match';
    ctx.fillText(`conversion η = ${(eta * 100).toFixed(1)}%  (${pm})`, 16, 50);
  }
}
window.addEventListener('DOMContentLoaded', () => new SHG());
