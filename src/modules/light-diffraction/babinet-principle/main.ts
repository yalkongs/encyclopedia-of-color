import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function sinc(x: number): number {
  if (Math.abs(x) < 1e-9) return 1;
  return Math.sin(x) / x;
}

class Babinet {
  private stage: CanvasStage;
  private a = 80;        // µm
  private lambda = 550;  // nm
  private mode = 0;      // 0 slit, 1 wire

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.a = hydrateNumber('a', 80);
    this.lambda = hydrateNumber('lambda', 550);
    this.mode = hydrateNumber('mode', 0);
    (document.getElementById('a') as EncSlider).value = this.a;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('mode') as EncSlider).value = this.mode;
    registerStateParam('a', () => this.a);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('mode', () => this.mode);
    for (const id of ['a', 'lambda', 'mode']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'a') this.a = v;
        else if (id === 'lambda') this.lambda = v;
        else this.mode = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.a = 80; this.lambda = 550; this.mode = 0;
      (document.getElementById('a') as EncSlider).value = 80;
      (document.getElementById('lambda') as EncSlider).value = 550;
      (document.getElementById('mode') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Object icon (top-left): slit (gap in barrier) or wire (bar in clear field).
    const iconCx = w * 0.16, iconCy = h * 0.22;
    const barH = h * 0.26, gap = Math.min(barH * 0.5, 8 + this.a * 0.12);
    if (this.mode === 0) {
      // Slit: opaque barrier with a transparent gap.
      ctx.fillStyle = theme.inkAlpha(0.55);
      ctx.fillRect(iconCx - 5, iconCy - barH / 2, 10, barH / 2 - gap / 2);
      ctx.fillRect(iconCx - 5, iconCy + gap / 2, 10, barH / 2 - gap / 2);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('slit (aperture)', iconCx - 36, iconCy + barH / 2 + 16);
    } else {
      // Wire: clear field with an opaque bar.
      ctx.strokeStyle = theme.inkAlpha(0.2); ctx.lineWidth = 1;
      ctx.strokeRect(iconCx - 5, iconCy - barH / 2, 10, barH);
      ctx.fillStyle = theme.crimson;
      ctx.fillRect(iconCx - 5, iconCy - gap / 2, 10, gap);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('wire (complement)', iconCx - 44, iconCy + barH / 2 + 16);
    }

    // Diffraction plot.
    const pad = 44;
    const plotX = pad + 6, plotY = h * 0.42, plotW = w - pad * 2, plotH = h * 0.42;
    const aM = this.a * 1e-6, lamM = this.lambda * 1e-9;
    const thetaMax = Math.min(0.4, 4 * (lamM / aM));
    const xOf = (theta: number) => plotX + ((theta + thetaMax) / (2 * thetaMax)) * plotW;
    const yOf = (I: number) => plotY + (1 - I) * plotH;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath(); ctx.moveTo(xOf(0), plotY); ctx.lineTo(xOf(0), plotY + plotH); ctx.stroke();

    const sidePattern = (theta: number) => {
      const alpha = (Math.PI * aM * Math.sin(theta)) / lamM;
      return sinc(alpha) ** 2;
    };

    // Shared side-lobe pattern (identical for slit & wire) — slate dashed reference.
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const theta = -thetaMax + (2 * thetaMax) * (i / 600);
      const px = xOf(theta), py = yOf(sidePattern(theta));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Observed pattern for the chosen object.
    ctx.strokeStyle = this.mode === 0 ? theme.crimson : theme.slate; ctx.lineWidth = 1.9;
    ctx.beginPath();
    for (let i = 0; i <= 800; i++) {
      const theta = -thetaMax + (2 * thetaMax) * (i / 800);
      let I = sidePattern(theta);
      if (this.mode === 1) {
        // Wire: side lobes identical; centre dominated by the unobstructed beam.
        const central = Math.exp(-((theta / (thetaMax * 0.03)) ** 2)); // narrow direct beam
        I = Math.min(1, sidePattern(theta) * 0.6 + central);
      }
      const px = xOf(theta), py = yOf(I);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let f = -1; f <= 1; f += 0.5) {
      const theta = f * thetaMax;
      ctx.fillText(`${(theta * RAD).toFixed(1)}°`, xOf(theta) - 12, plotY + plotH + 14);
    }
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('diffraction angle θ', plotX + plotW * 0.4, plotY + plotH + 28);

    // Legend.
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute; ctx.fillText('— — shared side-lobe pattern', plotX + plotW - 200, plotY + 14);
    ctx.fillStyle = this.mode === 0 ? theme.crimson : theme.slate;
    ctx.fillText(this.mode === 0 ? '— slit pattern' : '— wire pattern', plotX + plotW - 200, plotY + 30);

    // Readouts.
    const min1 = Math.asin(Math.min(1, lamM / aM)) * RAD;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`a = ${this.a} µm   λ = ${this.lambda} nm`, w * 0.34, 28);
    ctx.fillText(`first minimum at θ = ±${min1.toFixed(2)}°  (same for slit & wire)`, w * 0.34, 50);
  }
}
window.addEventListener('DOMContentLoaded', () => new Babinet());
