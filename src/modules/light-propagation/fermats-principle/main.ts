import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class FermatsPrinciple {
  private stage: CanvasStage;
  private xCrossPct = 50;      // crossing position as % of canvas width
  private n2 = 1.33;            // lower medium index

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.xCrossPct = hydrateNumber('x', 50);
    this.n2 = hydrateNumber('n2', 1.33);
    (document.getElementById('x') as EncSlider).value = this.xCrossPct;
    (document.getElementById('n2') as EncSlider).value = this.n2;

    registerStateParam('x', () => this.xCrossPct);
    registerStateParam('n2', () => this.n2);

    (document.getElementById('x') as EncSlider).addEventListener('input', (e) => {
      this.xCrossPct = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('n2') as EncSlider).addEventListener('input', (e) => {
      this.n2 = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.xCrossPct = 50; this.n2 = 1.33;
      (document.getElementById('x') as EncSlider).value = 50;
      (document.getElementById('n2') as EncSlider).value = 1.33;
      this.draw(); notifyStateChange();
    });
  }

  /** Total optical path time T = n1·d1/c + n2·d2/c, units arbitrary. */
  private timeAt(xCross: number, aX: number, aY: number, bX: number, bY: number): number {
    const d1 = Math.hypot(xCross - aX, aY);
    const d2 = Math.hypot(xCross - bX, bY);
    return d1 + this.n2 * d2;
  }

  /** Numeric Snell minimum (1D golden-section over xCross). */
  private fermatX(aX: number, aY: number, bX: number, bY: number, xMin: number, xMax: number): number {
    let lo = xMin, hi = xMax;
    const phi = (Math.sqrt(5) - 1) / 2;
    let c = hi - phi * (hi - lo);
    let d = lo + phi * (hi - lo);
    for (let i = 0; i < 60; i++) {
      const fc = this.timeAt(c, aX, aY, bX, bY);
      const fd = this.timeAt(d, aX, aY, bX, bY);
      if (fc < fd) { hi = d; d = c; c = hi - phi * (hi - lo); }
      else         { lo = c; c = d; d = lo + phi * (hi - lo); }
    }
    return (lo + hi) / 2;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const aX = 60, aY = h * 0.25;            // start point above water
    const bX = w - 60, bY = h * 0.75;        // end point under water
    const waterY = h * 0.5;
    const xCross = (this.xCrossPct / 100) * w;

    // Lower medium tint
    ctx.fillStyle = theme.slateAlpha(0.06);
    ctx.fillRect(0, waterY, w, h - waterY);

    // Interface
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, waterY); ctx.lineTo(w, waterY); ctx.stroke();

    // Plot Time(x) at the bottom strip
    const plotH = 80;
    const plotY0 = h - 90;
    const xCrossMin = aX + 10, xCrossMax = bX - 10;
    const samples = 200;
    const times: { x: number; t: number }[] = [];
    let minT = Infinity, maxT = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const xc = xCrossMin + (xCrossMax - xCrossMin) * (i / samples);
      const t = this.timeAt(xc, aX, aY, bX, bY - waterY);
      times.push({ x: xc, t });
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    ctx.strokeStyle = axisStyle.grid;
    ctx.beginPath(); ctx.moveTo(60, plotY0); ctx.lineTo(w - 60, plotY0); ctx.stroke();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    times.forEach((p, i) => {
      const x = p.x;
      const y = plotY0 - ((p.t - minT) / (maxT - minT + 1e-9)) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Optimal x
    const xOpt = this.fermatX(aX, aY, bX, bY - waterY, xCrossMin, xCrossMax);
    const yOptPlot = plotY0 - ((this.timeAt(xOpt, aX, aY, bX, bY - waterY) - minT) / (maxT - minT + 1e-9)) * plotH;
    ctx.strokeStyle = theme.crimson;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(xOpt, waterY); ctx.lineTo(xOpt, plotY0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(xOpt, yOptPlot, 5, 0, Math.PI * 2); ctx.fill();

    // User's chosen path
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(aX, aY); ctx.lineTo(xCross, waterY); ctx.lineTo(bX, bY);
    ctx.stroke();
    // Optimal path (faint reference)
    ctx.strokeStyle = theme.goldAlpha(0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(aX, aY); ctx.lineTo(xOpt, waterY); ctx.lineTo(bX, bY);
    ctx.stroke();

    // Endpoints A, B
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(aX, aY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bX, bY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('A (air)', aX + 12, aY + 4);
    ctx.fillText('B (water)', bX - 60, bY + 4);

    // Crossing-point handle
    ctx.fillStyle = theme.crimson;
    ctx.strokeStyle = theme.paper;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(xCross, waterY, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Snell angles for the actual minimum
    const sinT1 = (xOpt - aX) / Math.hypot(xOpt - aX, aY);
    const sinT2 = (bX - xOpt) / Math.hypot(bX - xOpt, bY - waterY);
    const t1Deg = Math.asin(sinT1) * RAD;
    const t2Deg = Math.asin(sinT2) * RAD;

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    const T = this.timeAt(xCross, aX, aY, bX, bY - waterY);
    ctx.fillText(`your time = ${T.toFixed(1)}`, 16, 28);
    ctx.fillText(`minimum   = ${this.timeAt(xOpt, aX, aY, bX, bY - waterY).toFixed(1)}`, 16, 50);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`Δ = ${(T - this.timeAt(xOpt, aX, aY, bX, bY - waterY)).toFixed(2)}`, 16, 72);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Snell at minimum: n₁·sin θ₁ = ${(1 * sinT1).toFixed(3)}   n₂·sin θ₂ = ${(this.n2 * sinT2).toFixed(3)}`, 16, 94);
    ctx.fillText(`θ₁ = ${t1Deg.toFixed(1)}°   θ₂ = ${t2Deg.toFixed(1)}°`, 16, 110);
  }
}

window.addEventListener('DOMContentLoaded', () => new FermatsPrinciple());
