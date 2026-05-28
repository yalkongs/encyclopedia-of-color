import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { stefanBoltzmannExitance } from '@core/math/photometry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TMIN = 300, TMAX = 8000;

class StefanBoltzmann {
  private stage: CanvasStage;
  private T = 3000;
  private Tref = 1500;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.T = hydrateNumber('T', 3000);
    this.Tref = hydrateNumber('Tref', 1500);
    (document.getElementById('T') as EncSlider).value = this.T;
    (document.getElementById('Tref') as EncSlider).value = this.Tref;
    registerStateParam('T', () => this.T);
    registerStateParam('Tref', () => this.Tref);
    for (const id of ['T', 'Tref']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'T') this.T = v; else this.Tref = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.T = 3000; this.Tref = 1500;
      (document.getElementById('T') as EncSlider).value = 3000;
      (document.getElementById('Tref') as EncSlider).value = 1500;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 56;
    const plotX = pad + 8, plotY = pad - 10, plotW = w - pad * 2, plotH = h - pad * 2.4;
    const Mmax = stefanBoltzmannExitance(TMAX);
    const xOf = (T: number) => plotX + ((T - TMIN) / (TMAX - TMIN)) * plotW;
    const yOf = (M: number) => plotY + (1 - M / Mmax) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Quartic curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const T = TMIN + (TMAX - TMIN) * (i / 300);
      const px = xOf(T), py = yOf(stefanBoltzmannExitance(T));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Markers for T and T_ref.
    const mark = (T: number, col: string, label: string) => {
      const M = stefanBoltzmannExitance(T);
      ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xOf(T), plotY + plotH); ctx.lineTo(xOf(T), yOf(M)); ctx.lineTo(plotX, yOf(M)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xOf(T), yOf(M), 5, 0, 2 * Math.PI); ctx.fill();
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(label, xOf(T) + 6, yOf(M) - 6);
    };
    mark(this.Tref, theme.slate, 'T_ref');
    mark(this.T, theme.goldDeep, 'T');

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let T = 2000; T <= 8000; T += 2000) ctx.fillText(`${T}`, xOf(T) - 14, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('temperature T (K)', plotX + plotW * 0.4, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 42, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('radiant exitance M (W/m²)', -70, 0); ctx.restore();

    // Readouts.
    const M = stefanBoltzmannExitance(this.T);
    const Mref = stefanBoltzmannExitance(this.Tref);
    const ratio = M / Mref;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`M(${this.T}K) = ${M.toExponential(2)} W/m²`, plotX + 4, plotY + 8);
    ctx.fillText(`M(${this.Tref}K) = ${Mref.toExponential(2)} W/m²`, plotX + 4, plotY + 26);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`ratio M/M_ref = (T/T_ref)⁴ = ${ratio.toFixed(2)}×`, plotX + 4, plotY + 46);
  }
}
window.addEventListener('DOMContentLoaded', () => new StefanBoltzmann());
