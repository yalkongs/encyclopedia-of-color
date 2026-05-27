import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Band {
  name: string;
  logMin: number;     // log10(λ in metres)
  logMax: number;
  color: string;
  source: string;
}

// log10(λ) thresholds in metres
const BANDS: Band[] = [
  { name: 'Radio',       logMin: 3,    logMax: 1,   color: '#7a5230', source: 'AM/FM, broadcast TV' },
  { name: 'Microwave',   logMin: 1,    logMax: -3,  color: '#a86a40', source: 'WiFi, 5G, ovens' },
  { name: 'Infrared',    logMin: -3,   logMax: -6,  color: '#cd7a3a', source: 'heat lamps, remotes' },
  { name: 'Visible',     logMin: -6.10, logMax: -6.40, color: '#7b9e3a', source: 'the sun, lamps' },
  { name: 'Ultraviolet', logMin: -6.40, logMax: -8,  color: '#4a4ab4', source: 'sunburn, sterilisers' },
  { name: 'X-ray',       logMin: -8,   logMax: -11, color: '#5d1f6a', source: 'medical imaging' },
  { name: 'Gamma',       logMin: -11,  logMax: -14, color: '#7d1a1a', source: 'nuclear decay' },
];

class EmSpectrumTour {
  private stage: CanvasStage;
  /** log10(λ) in metres; canonical range −14 (gamma) to +3 (long radio) */
  private logLambda = -7;   // ~visible green

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.logLambda = hydrateNumber('log', -70) / 10;
    (document.getElementById('log') as EncSlider).value = this.logLambda * 10;
    registerStateParam('log', () => Math.round(this.logLambda * 10));

    (document.getElementById('log') as EncSlider).addEventListener('input', (e) => {
      this.logLambda = (e.target as EncSlider).value / 10;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.logLambda = -7;
      (document.getElementById('log') as EncSlider).value = -70;
      this.draw(); notifyStateChange();
    });
  }

  private band(): Band {
    for (const b of BANDS) {
      const lo = Math.min(b.logMin, b.logMax), hi = Math.max(b.logMin, b.logMax);
      if (this.logLambda >= lo && this.logLambda <= hi) return b;
    }
    return BANDS[0];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padX = 60;
    const yBar = h * 0.55;
    const barH = 70;
    const xMin = padX, xMax = w - padX;
    const logMin = -14, logMax = 4;
    const xOf = (log: number) => xMin + ((log - logMin) / (logMax - logMin)) * (xMax - xMin);

    // Coloured band strip
    for (const b of BANDS) {
      const x1 = xOf(Math.max(b.logMax, logMin));
      const x2 = xOf(Math.min(b.logMin, logMax));
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(Math.min(x1, x2), yBar, Math.abs(x2 - x1), barH);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.inkAlpha(0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(xMin, yBar, xMax - xMin, barH);

    // Band labels under bar
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = axisStyle.label;
    for (const b of BANDS) {
      const mid = (b.logMin + b.logMax) / 2;
      const x = xOf(mid);
      ctx.save();
      ctx.translate(x, yBar + barH + 20);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(b.name, -ctx.measureText(b.name).width / 2, 0);
      ctx.restore();
    }

    // Decade ticks
    ctx.fillStyle = axisStyle.label;
    ctx.font = '10px JetBrains Mono, monospace';
    for (let i = logMin; i <= logMax; i += 2) {
      const x = xOf(i);
      ctx.strokeStyle = axisStyle.gridMajor;
      ctx.beginPath(); ctx.moveTo(x, yBar - 4); ctx.lineTo(x, yBar); ctx.stroke();
      ctx.fillText(`10^${i}`, x - 12, yBar - 8);
    }
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('λ (metres)', xMax - 60, yBar - 22);

    // Probe
    const px = xOf(this.logLambda);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, yBar - 16); ctx.lineTo(px, yBar + barH + 30); ctx.stroke();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(px, yBar + barH / 2, 7, 0, Math.PI * 2); ctx.fill();

    // Readouts
    const lambdaM = Math.pow(10, this.logLambda);
    const freq = 299_792_458 / lambdaM;
    const photonJ = 6.626e-34 * freq;
    const photonEv = photonJ / 1.602e-19;
    const band = this.band();

    ctx.font = 'italic 18px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`${band.name}`, 16, 36);
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillStyle = theme.ink;
    ctx.fillText(`λ        = ${this.fmtSci(lambdaM)} m`, 16, 60);
    ctx.fillText(`f        = ${this.fmtSci(freq)} Hz`, 16, 80);
    ctx.fillText(`E_photon = ${this.fmtSci(photonEv)} eV`, 16, 100);
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText(`typical source: ${band.source}`, 16, 122);
  }

  private fmtSci(v: number): string {
    if (!isFinite(v) || v === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(v)));
    const mant = v / Math.pow(10, exp);
    return `${mant.toFixed(2)} × 10^${exp}`;
  }
}

window.addEventListener('DOMContentLoaded', () => new EmSpectrumTour());
