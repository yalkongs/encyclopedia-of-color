import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { lCone, mCone, sCone, LAMBDA_MAX } from '@core/math/cone-fundamentals';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAM_MIN = 390, LAM_MAX = 700;
const CONES: Array<{ key: 'L' | 'M' | 'S'; f: (l: number) => number; color: string; peak: number }> = [
  { key: 'S', f: sCone, color: '#2b6cb0', peak: LAMBDA_MAX.S },
  { key: 'M', f: mCone, color: '#2f8f4e', peak: LAMBDA_MAX.M },
  { key: 'L', f: lCone, color: '#c0392b', peak: LAMBDA_MAX.L },
];

class LmsSpectra {
  private stage: CanvasStage;
  private lambda = 550;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 550);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('lambda', () => this.lambda);
    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.lambda = 550;
      (document.getElementById('lambda') as EncSlider).value = 550;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 52, padR = 28, padT = 36, padB = 64;
    const plotX = padL, plotY = padT;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (lam: number) => plotX + ((lam - LAM_MIN) / (LAM_MAX - LAM_MIN)) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;

    // Spectral colour wash along the x-axis baseline.
    for (let px = 0; px < plotW; px++) {
      const lam = LAM_MIN + (px / plotW) * (LAM_MAX - LAM_MIN);
      ctx.fillStyle = wavelengthRGB(lam, 0.75);
      ctx.fillRect(plotX + px, plotY + plotH + 4, 1, 8);
    }

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
    // X grid + labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let lam = 400; lam <= 700; lam += 50) {
      const x = xOf(lam);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
      ctx.fillStyle = axisStyle.label; ctx.fillText(String(lam), x, plotY + plotH + 28);
    }
    ctx.fillText('wavelength (nm)', plotX + plotW / 2, plotY + plotH + 46);
    ctx.textAlign = 'left';

    // Cone curves.
    for (const c of CONES) {
      ctx.strokeStyle = c.color; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= plotW; i++) {
        const lam = LAM_MIN + (i / plotW) * (LAM_MAX - LAM_MIN);
        const v = Math.max(0, c.f(lam));
        const px = plotX + i, py = yOf(v);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // Peak label.
      ctx.fillStyle = c.color; ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(`${c.key}  ${c.peak} nm`, xOf(c.peak) - 18, yOf(1) - 6);
    }

    // Wavelength marker.
    const mx = xOf(this.lambda);
    ctx.strokeStyle = theme.inkAlpha(0.55); ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, plotY); ctx.lineTo(mx, plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Response dots at the marker + readout.
    const resp: Record<string, number> = {};
    for (const c of CONES) {
      const v = Math.max(0, c.f(this.lambda));
      resp[c.key] = v;
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(mx, yOf(v), 4, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = theme.paper; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(
      `λ = ${this.lambda} nm    L ${resp.L.toFixed(2)}   M ${resp.M.toFixed(2)}   S ${resp.S.toFixed(2)}`,
      plotX, plotY - 14,
    );
  }
}

/** Approximate visible-spectrum colour for a wavelength (display cue only). */
function wavelengthRGB(lam: number, gamma = 0.8): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440) { r = -(lam - 440) / 60; b = 1; }
  else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / 20; }
  else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / 65; }
  else { r = 1; }
  const f = lam < 420 ? 0.3 + 0.7 * (lam - 390) / 30 : lam > 680 ? 0.3 + 0.7 * (700 - lam) / 20 : 1;
  const ch = (x: number) => Math.round(255 * Math.pow(Math.max(0, x) * f, gamma));
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

window.addEventListener('DOMContentLoaded', () => new LmsSpectra());
