import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { wienPeakNm } from '@core/math/photometry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TMIN = 1000, TMAX = 15000;
const LMAX = 2900; // nm shown on the peak-wavelength axis

const MARKERS = [
  { T: 2700, name: 'incandescent bulb' },
  { T: 5778, name: 'the Sun' },
  { T: 9940, name: 'Sirius A' },
];

class WienDisplacement {
  private stage: CanvasStage;
  private T = 5778;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.T = hydrateNumber('T', 5778);
    (document.getElementById('T') as EncSlider).value = this.T;
    registerStateParam('T', () => this.T);
    (document.getElementById('T') as EncSlider).addEventListener('input', (e) => {
      this.T = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.T = 5778;
      (document.getElementById('T') as EncSlider).value = 5778;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 54;
    const plotX = pad + 8, plotY = pad - 10, plotW = w - pad * 2, plotH = h - pad * 2.4;
    const xOf = (T: number) => plotX + ((T - TMIN) / (TMAX - TMIN)) * plotW;
    // Long wavelength at TOP (cool bodies peak in IR ⇒ large λ).
    const yOfInv = (l: number) => plotY + (1 - Math.min(1, l / LMAX)) * plotH;

    // Visible band horizontal stripe (380–780 nm) on the λ axis.
    const vTop = yOfInv(780), vBot = yOfInv(380);
    const grad = ctx.createLinearGradient(0, vBot, 0, vTop);
    grad.addColorStop(0, 'rgba(190,0,0,0.10)');
    grad.addColorStop(0.5, 'rgba(0,180,0,0.10)');
    grad.addColorStop(1, 'rgba(70,0,130,0.10)');
    ctx.fillStyle = grad; ctx.fillRect(plotX, vTop, plotW, vBot - vTop);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('visible band', plotX + 6, (vTop + vBot) / 2);

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Wien hyperbola λ = b/T.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 400; i++) {
      const T = TMIN + (TMAX - TMIN) * (i / 400);
      const l = wienPeakNm(T);
      if (l > LMAX) continue;
      const px = xOf(T), py = yOfInv(l);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Object markers.
    ctx.font = '10px Inter, sans-serif';
    for (const mk of MARKERS) {
      const l = wienPeakNm(mk.T);
      const px = xOf(mk.T), py = yOfInv(l);
      ctx.fillStyle = theme.slate;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = theme.inkMute;
      ctx.fillText(mk.name, px + 6, py - 4);
    }

    // Current point.
    const lcur = wienPeakNm(this.T);
    if (lcur <= LMAX) {
      const px = xOf(this.T), py = yOfInv(lcur);
      ctx.strokeStyle = theme.goldAlpha(0.6); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, plotY + plotH); ctx.lineTo(px, py); ctx.lineTo(plotX, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.goldDeep;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.fill();
    }

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let T = 2000; T <= 14000; T += 3000) ctx.fillText(`${T}`, xOf(T) - 14, plotY + plotH + 14);
    for (let l = 0; l <= LMAX; l += 500) ctx.fillText(`${l}`, plotX - 36, yOfInv(l) + 3);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('temperature T (K)', plotX + plotW * 0.4, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 40, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('peak wavelength λ (nm)', -64, 0); ctx.restore();

    // Readouts.
    let band = lcur > 780 ? 'infrared' : lcur < 380 ? 'ultraviolet' : 'visible';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`T = ${this.T} K   →   λ_peak = ${lcur.toFixed(0)} nm  (${band})`, plotX + 4, plotY + 8);
  }
}
window.addEventListener('DOMContentLoaded', () => new WienDisplacement());
