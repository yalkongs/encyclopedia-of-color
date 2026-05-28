import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { melanopsin } from '@core/math/cone-fundamentals';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAM_MIN = 400, LAM_MAX = 650;
const HALF = 0.35; // melanopic dose at half-maximal suppression

class IprgcCircadian {
  private stage: CanvasStage;
  private lambda = 480;
  private intensity = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 480);
    this.intensity = hydrateNumber('intensity', 60);
    for (const id of ['lambda', 'intensity'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.lambda = 480; this.intensity = 60;
      (document.getElementById('lambda') as EncSlider).value = 480;
      (document.getElementById('intensity') as EncSlider).value = 60;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 50, padR = 28, padT = 36;
    const plotX = padL, plotY = padT;
    const plotW = w - padL - padR, plotH = h * 0.52;
    const xOf = (lam: number) => plotX + ((lam - LAM_MIN) / (LAM_MAX - LAM_MIN)) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;

    // Spectral wash baseline.
    for (let px = 0; px < plotW; px++) {
      const lam = LAM_MIN + (px / plotW) * (LAM_MAX - LAM_MIN);
      ctx.fillStyle = wavelengthRGB(lam, 0.7);
      ctx.fillRect(plotX + px, plotY + plotH + 4, 1, 8);
    }

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let lam = 400; lam <= 650; lam += 50) {
      const x = xOf(lam);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
      ctx.fillStyle = axisStyle.label; ctx.fillText(String(lam), x, plotY + plotH + 28);
    }
    ctx.fillText('wavelength (nm)', plotX + plotW / 2, plotY + plotH + 44);
    ctx.textAlign = 'left';

    // Melanopsin action spectrum.
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const lam = LAM_MIN + (i / plotW) * (LAM_MAX - LAM_MIN);
      const v = Math.max(0, melanopsin(lam));
      const px = plotX + i, py = yOf(v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = '#2b6cb0'; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('melanopsin  480 nm', xOf(480) + 6, yOf(1) + 2);

    // Wavelength marker + sensitivity dot.
    const sens = Math.max(0, melanopsin(this.lambda));
    const mx = xOf(this.lambda);
    ctx.strokeStyle = theme.inkAlpha(0.55); ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, plotY); ctx.lineTo(mx, plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(mx, yOf(sens), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();

    // --- Melatonin suppression gauge. ---
    const dose = sens * (this.intensity / 100);
    const suppression = dose / (dose + HALF); // 0..1
    const gx = plotX, gy = plotY + plotH + 70, gw = plotW, gh = 26;
    ctx.fillStyle = theme.paperRecess; ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = theme.slate; ctx.fillRect(gx, gy, suppression * gw, gh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('melatonin suppression', gx, gy - 8);

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(
      `λ = ${this.lambda} nm    melanopic sensitivity ${sens.toFixed(2)}    suppression ${(suppression * 100).toFixed(0)}%`,
      gx, gy + gh + 22,
    );
  }
}

function wavelengthRGB(lam: number, gamma = 0.8): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440) { r = -(lam - 440) / 60; b = 1; }
  else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / 20; }
  else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / 65; }
  else { r = 1; }
  const ch = (x: number) => Math.round(255 * Math.pow(Math.max(0, x), gamma));
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

window.addEventListener('DOMContentLoaded', () => new IprgcCircadian());
