import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class MalusLaw {
  private stage: CanvasStage;
  private thetaDeg = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.thetaDeg = hydrateNumber('theta', 30);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    registerStateParam('theta', () => this.thetaDeg);

    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.thetaDeg = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      (document.getElementById('theta') as EncSlider).value = 30;
      this.thetaDeg = 30; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const theta = this.thetaDeg * DEG;
    const I = Math.cos(theta) * Math.cos(theta);

    // Layout: 3 polariser symbols + a graph on the right
    const padX = 40;
    const polY = h * 0.35;
    const polR = Math.min(60, w * 0.06);
    const x1 = padX + polR;
    const x2 = w * 0.32;
    const x3 = w * 0.55;

    // Unpolarised beam in
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, polY); ctx.lineTo(x1 - polR, polY); ctx.stroke();

    // Polariser 1 (vertical axis)
    this.drawPolariser(ctx, x1, polY, polR, 0, 'fixed', theme.ink);
    // Polariser 2 (rotated by θ)
    this.drawPolariser(ctx, x2, polY, polR, theta, 'rotated', theme.goldDeep);
    // Polariser 3 (analyser horizontal — could be omitted, kept for visual symmetry)
    // Not used here for math; the 2-polariser version is canonical

    // Beam between P1 and P2 (full intensity, vertical polarisation)
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x1 + polR, polY); ctx.lineTo(x2 - polR, polY); ctx.stroke();

    // Beam after P2 (intensity × cos²θ)
    ctx.strokeStyle = theme.inkAlpha(0.2 + I * 0.7);
    ctx.lineWidth = 2 + I * 2;
    ctx.beginPath(); ctx.moveTo(x2 + polR, polY); ctx.lineTo(x3, polY); ctx.stroke();

    // Sensor box at end
    ctx.fillStyle = theme.ink;
    ctx.fillRect(x3, polY - 22, 14, 44);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('sensor', x3 - 6, polY + 38);

    // Labels
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('P1 (fixed)', x1 - 28, polY + polR + 20);
    ctx.fillText('P2 (θ)',    x2 - 18, polY + polR + 20);

    // cos²θ graph — right side
    const gx0 = w * 0.62;
    const gy0 = h * 0.65;
    const gW = w - gx0 - 40;
    const gH = 200;
    const gx1 = gx0 + gW;
    const gy1 = gy0 - gH;
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx0, gy0); ctx.lineTo(gx1, gy0);   // x axis
    ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1);   // y axis
    ctx.stroke();

    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('θ →', gx1 + 4, gy0 + 4);
    ctx.fillText('I/I₀', gx0 - 32, gy1 + 8);

    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const t = i * DEG;
      const c2 = Math.cos(t) * Math.cos(t);
      const px = gx0 + (i / 360) * gW;
      const py = gy0 - c2 * gH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Marker at current θ
    const markX = gx0 + ((this.thetaDeg % 360) / 360) * gW;
    const markY = gy0 - I * gH;
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(markX, markY, 5, 0, Math.PI * 2); ctx.fill();

    // Readout
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ = ${this.thetaDeg.toFixed(1)}°`, gx0, gy1 - 14);
    ctx.fillText(`I / I₀ = cos²θ = ${I.toFixed(3)}`, gx0, gy1 - 34);
  }

  private drawPolariser(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number, axisRad: number,
    label: string, color: string,
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // Polariser slits
    ctx.lineWidth = 1;
    const slits = 7;
    const a = axisRad - Math.PI / 2; // perpendicular to transmission axis = slit direction
    for (let i = -slits; i <= slits; i++) {
      const dx = -Math.sin(a) * (i / slits) * r;
      const dy =  Math.cos(a) * (i / slits) * r;
      const half = Math.sqrt(Math.max(0, r * r - ((i / slits) * r) ** 2));
      const tx = Math.cos(a) * half;
      const ty = Math.sin(a) * half;
      ctx.beginPath();
      ctx.moveTo(cx + dx - tx, cy + dy - ty);
      ctx.lineTo(cx + dx + tx, cy + dy + ty);
      ctx.stroke();
    }
    // Transmission-axis arrow
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(axisRad - Math.PI / 2) * r, cy - Math.sin(axisRad - Math.PI / 2) * r);
    ctx.lineTo(cx + Math.cos(axisRad - Math.PI / 2) * r, cy + Math.sin(axisRad - Math.PI / 2) * r);
    ctx.stroke();
    void label;
  }
}

window.addEventListener('DOMContentLoaded', () => new MalusLaw());
