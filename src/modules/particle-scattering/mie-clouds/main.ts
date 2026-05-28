import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { sizeParameter, mieQextADT, rayleighQsca } from '@core/math/scattering';
import { spectralToXYZ, xyzToSrgb, rgbToCssRgb } from '@core/math/spectral';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 380, LMAX = 780;

class MieClouds {
  private stage: CanvasStage;
  private logr = 0.0;   // log10(radius/nm)
  private m = 1.33;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.logr = hydrateNumber('logr', 0.0);
    this.m = hydrateNumber('m', 1.33);
    (document.getElementById('logr') as EncSlider).value = this.logr;
    (document.getElementById('m') as EncSlider).value = this.m;
    registerStateParam('logr', () => this.logr);
    registerStateParam('m', () => this.m);
    for (const id of ['logr', 'm']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'logr') this.logr = v; else this.m = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.logr = 0.0; this.m = 1.33;
      (document.getElementById('logr') as EncSlider).value = 0.0;
      (document.getElementById('m') as EncSlider).value = 1.33;
      this.draw(); notifyStateChange();
    });
  }

  // Continuous scattering efficiency blending Rayleigh and ADT regimes.
  private Q(lambda: number, r: number): number {
    const x = sizeParameter(r, lambda);
    const ray = rayleighQsca(x, this.m);
    if (x <= 0.6) return ray;
    const adt = Math.max(0, mieQextADT(x, this.m));
    if (x >= 1.2) return adt;
    const t = (x - 0.6) / 0.6;          // 0..1 blend
    const s = t * t * (3 - 2 * t);
    return ray * (1 - s) + adt * s;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const r = Math.pow(10, this.logr);  // nm
    const pad = 48;
    const plotX = pad + 6, plotY = pad - 12, plotW = w - pad * 2 - w * 0.12, plotH = h - pad * 2.3;

    // Sample Q over band, find max for normalisation.
    const samples: number[] = [];
    let qMax = 0;
    for (let i = 0; i <= 200; i++) {
      const l = LMIN + (LMAX - LMIN) * (i / 200);
      const q = this.Q(l, r);
      samples.push(q);
      if (q > qMax) qMax = q;
    }
    if (qMax <= 0) qMax = 1;

    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (qn: number) => plotY + (1 - qn) * plotH;

    // Spectrum tint background.
    const grad = ctx.createLinearGradient(plotX, 0, plotX + plotW, 0);
    grad.addColorStop(0.00, 'rgba(70,0,130,0.06)');
    grad.addColorStop(0.30, 'rgba(0,0,255,0.06)');
    grad.addColorStop(0.55, 'rgba(0,180,0,0.06)');
    grad.addColorStop(0.75, 'rgba(255,200,0,0.07)');
    grad.addColorStop(1.00, 'rgba(190,0,0,0.06)');
    ctx.fillStyle = grad; ctx.fillRect(plotX, plotY, plotW, plotH);

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Normalised Q(λ) curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const l = LMIN + (LMAX - LMIN) * (i / (samples.length - 1));
      const px = xOf(l), py = yOf(samples[i] / qMax);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let l = 400; l <= 700; l += 100) ctx.fillText(`${l}`, xOf(l) - 10, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('λ (nm)', plotX + plotW * 0.42, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 30, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('relative scattering Q (normalised)', plotX < 0 ? -40 : -90, 0); ctx.restore();

    // Scattered colour swatch (right).
    const xyz = spectralToXYZ((lam) => this.Q(lam, r));
    let rgb = xyzToSrgb(xyz);
    const mx = Math.max(rgb.r, rgb.g, rgb.b, 1e-6);
    rgb = { r: rgb.r / mx, g: rgb.g / mx, b: rgb.b / mx };
    const swX = plotX + plotW + 24, swY = plotY + 6, swW = w * 0.09, swH = plotH * 0.5;
    ctx.fillStyle = rgbToCssRgb(rgb);
    ctx.fillRect(swX, swY, swW, swH);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.strokeRect(swX, swY, swW, swH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('scattered', swX, swY + swH + 16);
    ctx.fillText('colour', swX, swY + swH + 30);

    // Readouts.
    const x550 = sizeParameter(r, 550);
    let regime = 'Rayleigh (λ⁻⁴, blue)';
    if (x550 > 8) regime = 'Mie (flat, white)';
    else if (x550 > 0.8) regime = 'Mie transition';
    const rNm = r >= 1000 ? `${(r / 1000).toFixed(2)} µm` : `${r.toFixed(1)} nm`;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`radius r = ${rNm}   size param x(550) = ${x550.toFixed(2)}`, plotX + 4, plotY + 8);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(regime, plotX + 4, plotY + 28);
  }
}
window.addEventListener('DOMContentLoaded', () => new MieClouds());
