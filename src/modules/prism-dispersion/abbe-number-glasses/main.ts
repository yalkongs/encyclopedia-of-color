import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { sellmeierN, SELLMEIER, abbeNumber } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface GlassSpec {
  name: string;
  fn: (lam: number) => number;
  color: string;
}

const GLASSES: GlassSpec[] = [
  { name: 'BK7 (crown)',     fn: (l) => sellmeierN(l, SELLMEIER.BK7.B, SELLMEIER.BK7.C),     color: '#4a5a6b' },  // slate
  { name: 'Fused Silica',     fn: (l) => sellmeierN(l, SELLMEIER.FUSED_SILICA.B, SELLMEIER.FUSED_SILICA.C), color: '#8b6a2f' },  // gold
  { name: 'SF11 (flint)',     fn: (l) => sellmeierN(l, SELLMEIER.SF11.B, SELLMEIER.SF11.C),   color: '#a83232' },  // crimson
];

const LMIN = 380, LMAX = 780;

class AbbeViz {
  private stage: CanvasStage;
  private lambda = 587;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 587);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('lambda', () => this.lambda);
    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.lambda = 587;
      (document.getElementById('lambda') as EncSlider).value = 587;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 48;
    const plotX = pad + 12, plotY = pad - 18;
    const plotW = w - pad * 2 - 12, plotH = h - pad * 2.4;

    // Determine n-range over [LMIN, LMAX] for all glasses.
    let nMin = +Infinity, nMax = -Infinity;
    for (const g of GLASSES) {
      for (let i = 0; i <= 80; i++) {
        const l = LMIN + (LMAX - LMIN) * (i / 80);
        const n = g.fn(l);
        if (n < nMin) nMin = n;
        if (n > nMax) nMax = n;
      }
    }
    const padN = (nMax - nMin) * 0.08;
    nMin -= padN; nMax += padN;

    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (n: number) => plotY + (1 - (n - nMin) / (nMax - nMin)) * plotH;

    // Visible-spectrum tint band background.
    const grad = ctx.createLinearGradient(plotX, 0, plotX + plotW, 0);
    grad.addColorStop(0.00, 'rgba(70, 0, 130, 0.05)');
    grad.addColorStop(0.18, 'rgba(0, 0, 255, 0.05)');
    grad.addColorStop(0.42, 'rgba(0, 180, 0, 0.05)');
    grad.addColorStop(0.60, 'rgba(255, 215, 0, 0.06)');
    grad.addColorStop(0.78, 'rgba(255, 100, 0, 0.06)');
    grad.addColorStop(1.00, 'rgba(170, 0, 0, 0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(plotX, plotY, plotW, plotH);

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    // Grid every 50 nm.
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 0.5;
    for (let l = 400; l <= 750; l += 50) {
      ctx.beginPath(); ctx.moveTo(xOf(l), plotY); ctx.lineTo(xOf(l), plotY + plotH); ctx.stroke();
    }

    // C/d/F gold ticks.
    const FRAUNHOFER = [
      { lam: 656.3, name: 'C' },
      { lam: 587.6, name: 'd' },
      { lam: 486.1, name: 'F' },
    ];
    ctx.strokeStyle = theme.goldAlpha(0.55);
    ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    for (const f of FRAUNHOFER) {
      ctx.beginPath(); ctx.moveTo(xOf(f.lam), plotY); ctx.lineTo(xOf(f.lam), plotY + plotH); ctx.stroke();
      ctx.fillStyle = theme.goldDeep;
      ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(f.name, xOf(f.lam) - 3, plotY - 4);
    }
    ctx.setLineDash([]);

    // Curves.
    ctx.lineWidth = 1.7;
    for (const g of GLASSES) {
      ctx.strokeStyle = g.color;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const l = LMIN + (LMAX - LMIN) * (i / 200);
        const n = g.fn(l);
        const x = xOf(l), y = yOf(n);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Current λ vertical (ink) + current-n dots.
    ctx.strokeStyle = theme.inkAlpha(0.7); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(xOf(this.lambda), plotY); ctx.lineTo(xOf(this.lambda), plotY + plotH); ctx.stroke();
    for (const g of GLASSES) {
      const n = g.fn(this.lambda);
      ctx.fillStyle = g.color;
      ctx.beginPath(); ctx.arc(xOf(this.lambda), yOf(n), 4, 0, 2 * Math.PI); ctx.fill();
    }

    // Y-axis ticks.
    ctx.fillStyle = axisStyle.label;
    ctx.font = '10px Inter, sans-serif';
    const nTicks = 5;
    for (let i = 0; i <= nTicks; i++) {
      const nVal = nMin + (nMax - nMin) * (i / nTicks);
      ctx.fillText(nVal.toFixed(3), plotX - 36, yOf(nVal) + 3);
    }
    for (let l = 400; l <= 700; l += 100) {
      ctx.fillText(`${l}`, xOf(l) - 10, plotY + plotH + 13);
    }

    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('λ (nm)', plotX + plotW * 0.45, plotY + plotH + 26);
    ctx.save();
    ctx.translate(plotX - 38, plotY + plotH * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('refractive index n', -56, 0);
    ctx.restore();

    // Legend with V_d readouts (below plot).
    const legY = plotY + plotH + 40;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    let legX = plotX;
    for (const g of GLASSES) {
      const V = abbeNumber(g.fn);
      const nCur = g.fn(this.lambda);
      ctx.fillStyle = g.color;
      ctx.fillRect(legX, legY - 8, 12, 12);
      ctx.fillStyle = theme.ink;
      ctx.fillText(`${g.name}   V_d=${V.toFixed(1)}   n(λ)=${nCur.toFixed(4)}`, legX + 18, legY + 2);
      legX += 250;
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new AbbeViz());
