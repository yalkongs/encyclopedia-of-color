import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { project3D, projectFrom, drawArrow3D, drawAxisTriad } from '@core/render/em-vector';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class EandBVectors {
  private stage: CanvasStage;
  private freq = 1.0;            // animation cycles per second
  private startTime = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.freq = hydrateNumber('f', 10) / 10;
    (document.getElementById('f') as EncSlider).value = this.freq * 10;
    registerStateParam('f', () => Math.round(this.freq * 10));

    (document.getElementById('f') as EncSlider).addEventListener('input', (e) => {
      this.freq = (e.target as EncSlider).value / 10;
      notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.freq = 1.0;
      (document.getElementById('f') as EncSlider).value = 10;
      notifyStateChange();
    });

    this.startTime = performance.now();
    this.loop();
  }

  private loop = () => {
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const t = (performance.now() - this.startTime) / 1000;
    const omega = 2 * Math.PI * this.freq;
    const k = 0.018;                 // spatial wavenumber
    const samples = 28;
    const xMin = -60, xMax = 540;    // world-x range
    const ampE = 60;                  // E amplitude (world units along +y)
    const ampB = 60;                  // B amplitude (along +z)

    // Origin near left-centre of canvas
    const origin = { x: 90, y: h * 0.55 };
    const scale = 1;

    // Reference x-axis line in world (faint)
    ctx.strokeStyle = axisStyle.grid;
    ctx.lineWidth = 1;
    const ax0 = projectFrom(origin, { x: xMin, y: 0, z: 0 }, scale);
    const ax1 = projectFrom(origin, { x: xMax, y: 0, z: 0 }, scale);
    ctx.beginPath(); ctx.moveTo(ax0.x, ax0.y); ctx.lineTo(ax1.x, ax1.y); ctx.stroke();

    // Axis triad at origin
    drawAxisTriad(ctx, origin, 1, { alpha: 0.4 });

    // E vectors (along +y) — ink
    for (let i = 0; i < samples; i++) {
      const x = xMin + ((xMax - xMin) * i) / (samples - 1);
      const yE = ampE * Math.sin(k * x - omega * t);
      const base = projectFrom(origin, { x, y: 0, z: 0 }, scale);
      const tip  = projectFrom(origin, { x, y: yE, z: 0 }, scale);
      ctx.strokeStyle = theme.inkAlpha(0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      // Tip cap
      ctx.fillStyle = theme.ink;
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // B vectors (along +z) — slate
    for (let i = 0; i < samples; i++) {
      const x = xMin + ((xMax - xMin) * i) / (samples - 1);
      const zB = ampB * Math.sin(k * x - omega * t);
      const base = projectFrom(origin, { x, y: 0, z: 0 }, scale);
      const tip  = projectFrom(origin, { x, y: 0, z: zB }, scale);
      ctx.strokeStyle = theme.slateAlpha(0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.fillStyle = theme.slate;
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Envelope curves
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = xMin + ((xMax - xMin) * i) / 240;
      const yE = ampE * Math.sin(k * x - omega * t);
      const p = projectFrom(origin, { x, y: yE, z: 0 }, scale);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = theme.slate;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = xMin + ((xMax - xMin) * i) / 240;
      const zB = ampB * Math.sin(k * x - omega * t);
      const p = projectFrom(origin, { x, y: 0, z: zB }, scale);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Featured single E·B pair near origin
    const xFeat = 0;
    const yE_f = ampE * Math.sin(k * xFeat - omega * t);
    const zB_f = ampB * Math.sin(k * xFeat - omega * t);
    const featOrigin = projectFrom(origin, { x: xFeat, y: 0, z: 0 }, scale);
    drawArrow3D(ctx, featOrigin, { x: 0, y: yE_f, z: 0 }, 1, theme.crimson, 2.5, 'E');
    drawArrow3D(ctx, featOrigin, { x: 0, y: 0, z: zB_f }, 1, theme.goldDeep, 2.5, 'B');

    // Labels
    const head = project3D({ x: xMax + 40, y: 0, z: 0 }, scale);
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('→ propagation direction', origin.x + head.x - 70, origin.y + head.y + 22);

    // Readout
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`f = ${this.freq.toFixed(1)} Hz`, 16, 28);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('E (crimson) ⊥ B (gold) ⊥ k̂ (right) — orthogonal triad', 16, 50);
  }
}

window.addEventListener('DOMContentLoaded', () => new EandBVectors());
