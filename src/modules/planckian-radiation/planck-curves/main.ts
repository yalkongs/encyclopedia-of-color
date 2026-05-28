import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { planckRadiance } from '@core/math/illuminants';
import { wienPeakNm } from '@core/math/photometry';
import { spectralToXYZ, xyzToSrgb, rgbToCssRgb } from '@core/math/spectral';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 300, LMAX = 1400; // nm, includes near-IR so the peak is visible at low T

class PlanckCurves {
  private stage: CanvasStage;
  private T = 3000;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.T = hydrateNumber('T', 3000);
    (document.getElementById('T') as EncSlider).value = this.T;
    registerStateParam('T', () => this.T);
    (document.getElementById('T') as EncSlider).addEventListener('input', (e) => {
      this.T = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.T = 3000;
      (document.getElementById('T') as EncSlider).value = 3000;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 50;
    const plotX = pad + 6, plotY = pad - 8, plotW = w - pad * 2 - w * 0.12, plotH = h - pad * 2.3;

    // Auto-scale to the current temperature's peak so the curve always fills the
    // plot — the headline is the *peak shift*, not absolute magnitude (that is the
    // Stefan-Boltzmann module). Peak radiance ∝ T⁵ would otherwise crush low-T curves.
    const peakNm = wienPeakNm(this.T);
    const refMax = planckRadiance(Math.max(peakNm, LMIN) * 1e-9, this.T) * 1.06;
    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (M: number) => plotY + (1 - Math.min(1, M / refMax)) * plotH;

    // Visible band shading.
    const vis0 = xOf(380), vis1 = xOf(780);
    const grad = ctx.createLinearGradient(vis0, 0, vis1, 0);
    grad.addColorStop(0.00, 'rgba(70,0,130,0.10)');
    grad.addColorStop(0.30, 'rgba(0,0,255,0.10)');
    grad.addColorStop(0.55, 'rgba(0,180,0,0.10)');
    grad.addColorStop(0.75, 'rgba(255,200,0,0.12)');
    grad.addColorStop(1.00, 'rgba(190,0,0,0.10)');
    ctx.fillStyle = grad; ctx.fillRect(vis0, plotY, vis1 - vis0, plotH);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('visible', (vis0 + vis1) / 2 - 16, plotY + 12);

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Main curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const l = LMIN + (LMAX - LMIN) * (i / 400);
      const M = planckRadiance(l * 1e-9, this.T);
      const px = xOf(l), py = yOf(M);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Peak marker.
    const peak = wienPeakNm(this.T);
    if (peak >= LMIN && peak <= LMAX) {
      const Mpeak = planckRadiance(peak * 1e-9, this.T);
      ctx.strokeStyle = theme.goldAlpha(0.7); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xOf(peak), plotY + plotH); ctx.lineTo(xOf(peak), yOf(Mpeak)); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let l = 400; l <= 1400; l += 200) ctx.fillText(`${l}`, xOf(l) - 10, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('wavelength λ (nm)', plotX + plotW * 0.4, plotY + plotH + 28);

    // Colour swatch (visible-band integration).
    const xyz = spectralToXYZ((lam) => planckRadiance(lam * 1e-9, this.T));
    const mx = Math.max(xyz.X, xyz.Y, xyz.Z, 1e-9);
    let rgb = xyzToSrgb({ X: xyz.X / mx, Y: xyz.Y / mx, Z: xyz.Z / mx });
    const cmax = Math.max(rgb.r, rgb.g, rgb.b, 1e-6);
    rgb = { r: rgb.r / cmax, g: rgb.g / cmax, b: rgb.b / cmax };
    const swX = plotX + plotW + 24, swY = plotY + 6, swW = w * 0.09, swH = plotH * 0.5;
    ctx.fillStyle = rgbToCssRgb(rgb); ctx.fillRect(swX, swY, swW, swH);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.strokeRect(swX, swY, swW, swH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('glow colour', swX, swY + swH + 16);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`T = ${this.T} K`, plotX + 4, plotY + 8);
    ctx.fillText(`peak λ = ${peak.toFixed(0)} nm ${peak > 780 ? '(infrared)' : peak < 380 ? '(ultraviolet)' : '(visible)'}`, plotX + 4, plotY + 28);
  }
}
window.addEventListener('DOMContentLoaded', () => new PlanckCurves());
