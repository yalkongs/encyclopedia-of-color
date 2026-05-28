import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function lambdaRGB(lam: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  return [r, g, b];
}

class TemporalCoherence {
  private stage: CanvasStage;
  private lambda = 550; // nm
  private dlam = 10;    // nm
  private dL = 20;      // µm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 550);
    this.dlam = hydrateNumber('dlam', 10);
    this.dL = hydrateNumber('dL', 20);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('dlam') as EncSlider).value = this.dlam;
    (document.getElementById('dL') as EncSlider).value = this.dL;
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('dlam', () => this.dlam);
    registerStateParam('dL', () => this.dL);
    for (const id of ['lambda', 'dlam', 'dL']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'lambda') this.lambda = v;
        else if (id === 'dlam') this.dlam = v;
        else this.dL = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.lambda = 550; this.dlam = 10; this.dL = 20;
      (document.getElementById('lambda') as EncSlider).value = 550;
      (document.getElementById('dlam') as EncSlider).value = 10;
      (document.getElementById('dL') as EncSlider).value = 20;
      this.draw(); notifyStateChange();
    });
  }

  // Coherence length in µm.
  private Lc(): number {
    return (this.lambda * this.lambda / this.dlam) / 1000;
  }
  private visibility(dL: number): number {
    return Math.exp(-((dL / this.Lc()) ** 2));
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const [r, g, b] = lambdaRGB(this.lambda);
    const V = this.visibility(this.dL);
    const Lc = this.Lc();

    // --- Top: fringe strip with contrast = V. ---
    const stripX = w * 0.08, stripW = w * 0.84, stripY = h * 0.14, stripH = h * 0.22;
    const fringes = 22;
    for (let px = 0; px < stripW; px++) {
      const phase = (px / stripW) * fringes * 2 * Math.PI;
      const I = 0.5 + 0.5 * V * Math.cos(phase);
      ctx.fillStyle = `rgb(${Math.round(r * 255 * I)},${Math.round(g * 255 * I)},${Math.round(b * 255 * I)})`;
      ctx.fillRect(stripX + px, stripY, 1, stripH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.2;
    ctx.strokeRect(stripX, stripY, stripW, stripH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`fringe contrast (visibility) = ${(V * 100).toFixed(0)}%`, stripX, stripY - 8);

    // --- Bottom: visibility vs path difference. ---
    const plotX = stripX, plotY = h * 0.46, plotW = stripW, plotH = h * 0.34;
    const dLmax = 120;
    const xOf = (d: number) => plotX + (d / dLmax) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const d = (dLmax * i) / 300;
      const px = xOf(d), py = yOf(this.visibility(d));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Coherence-length marker (V = 1/e).
    if (Lc <= dLmax) {
      ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xOf(Lc), plotY); ctx.lineTo(xOf(Lc), plotY + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('L_c', xOf(Lc) - 6, plotY - 2);
    }
    // Current ΔL marker.
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(xOf(this.dL), yOf(V), 4.5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let d = 0; d <= 120; d += 30) ctx.fillText(`${d}`, xOf(d) - 6, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('path difference ΔL (µm)', plotX + plotW * 0.36, plotY + plotH + 28);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`λ = ${this.lambda} nm   Δλ = ${this.dlam.toFixed(1)} nm   →   L_c = ${Lc.toFixed(1)} µm`, plotX, h * 0.92);
  }
}
window.addEventListener('DOMContentLoaded', () => new TemporalCoherence());
