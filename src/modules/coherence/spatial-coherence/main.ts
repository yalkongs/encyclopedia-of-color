import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { besselJ1 } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAMBDA_NM = 550;

class SpatialCoherence {
  private stage: CanvasStage;
  private a = 1.0;   // source diameter mm
  private d = 1.5;   // slit separation mm
  private R = 3.0;   // source distance m

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.a = hydrateNumber('a', 1.0);
    this.d = hydrateNumber('d', 1.5);
    this.R = hydrateNumber('R', 3.0);
    (document.getElementById('a') as EncSlider).value = this.a;
    (document.getElementById('d') as EncSlider).value = this.d;
    (document.getElementById('R') as EncSlider).value = this.R;
    registerStateParam('a', () => this.a);
    registerStateParam('d', () => this.d);
    registerStateParam('R', () => this.R);
    for (const id of ['a', 'd', 'R']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'a') this.a = v;
        else if (id === 'd') this.d = v;
        else this.R = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.a = 1.0; this.d = 1.5; this.R = 3.0;
      (document.getElementById('a') as EncSlider).value = 1.0;
      (document.getElementById('d') as EncSlider).value = 1.5;
      (document.getElementById('R') as EncSlider).value = 3.0;
      this.draw(); notifyStateChange();
    });
  }

  // van Cittert-Zernike visibility for a uniform circular source.
  private visibilityForD(dMm: number): number {
    const lam = LAMBDA_NM * 1e-9;
    const v = (Math.PI * (this.a * 1e-3) * (dMm * 1e-3)) / (lam * this.R);
    if (Math.abs(v) < 1e-6) return 1;
    return Math.abs((2 * besselJ1(v)) / v);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const V = this.visibilityForD(this.d);

    // Fringe strip (green) with contrast V.
    const stripX = w * 0.08, stripW = w * 0.84, stripY = h * 0.14, stripH = h * 0.22;
    const fringes = 20;
    for (let px = 0; px < stripW; px++) {
      const phase = (px / stripW) * fringes * 2 * Math.PI;
      const I = 0.5 + 0.5 * V * Math.cos(phase);
      ctx.fillStyle = `rgb(${Math.round(60 * I)},${Math.round(200 * I)},${Math.round(90 * I)})`;
      ctx.fillRect(stripX + px, stripY, 1, stripH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.2;
    ctx.strokeRect(stripX, stripY, stripW, stripH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`fringe visibility = ${(V * 100).toFixed(0)}%`, stripX, stripY - 8);

    // Visibility vs slit separation curve.
    const plotX = stripX, plotY = h * 0.46, plotW = stripW, plotH = h * 0.34;
    const dMax = 6;
    const xOf = (dd: number) => plotX + (dd / dMax) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const dd = (dMax * i) / 300;
      const px = xOf(dd), py = yOf(this.visibilityForD(dd));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // First coherence null: v = 3.8317 ⇒ d_null = 3.8317·λR/(π·a).
    const dNull = (3.8317 * (LAMBDA_NM * 1e-9) * this.R) / (Math.PI * (this.a * 1e-3)) * 1000; // mm
    if (dNull <= dMax) {
      ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xOf(dNull), plotY); ctx.lineTo(xOf(dNull), plotY + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('first null', xOf(dNull) - 18, plotY - 2);
    }
    // Current d marker.
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(xOf(this.d), yOf(V), 4.5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let dd = 0; dd <= 6; dd += 1.5) ctx.fillText(`${dd}`, xOf(dd) - 6, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('slit separation d (mm)', plotX + plotW * 0.36, plotY + plotH + 28);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`source a = ${this.a.toFixed(2)} mm   R = ${this.R.toFixed(1)} m   d = ${this.d.toFixed(2)} mm`, plotX, h * 0.92);
    ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(`coherence width ≈ ${dNull.toFixed(2)} mm at the slits`, plotX, h * 0.92 + 20);
  }
}
window.addEventListener('DOMContentLoaded', () => new SpatialCoherence());
