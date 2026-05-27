import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Animation: a moving source emits a wavefront every emitPeriod seconds.
 * Each wavefront is a circle that expands at wavespeed c, centred at the
 * source's *position at emission time*. As source moves, circles cluster
 * ahead and spread behind — the Doppler effect.
 */
class DopplerEffect {
  private stage: CanvasStage;
  private mach = 0.5;             // source speed / wave speed
  private wavefronts: { x: number; t0: number }[] = [];
  private startTime = 0;
  private lastEmit = 0;
  private readonly c = 100;             // wave speed (px/s)
  private readonly emitInterval = 0.6;  // seconds per wavefront

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.mach = hydrateNumber('mach', 50) / 100;
    (document.getElementById('mach') as EncSlider).value = this.mach * 100;
    registerStateParam('mach', () => Math.round(this.mach * 100));

    (document.getElementById('mach') as EncSlider).addEventListener('input', (e) => {
      this.mach = (e.target as EncSlider).value / 100;
      notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.mach = 0.5;
      (document.getElementById('mach') as EncSlider).value = 50;
      this.wavefronts = [];
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

    const cy = h / 2;
    const elapsed = (performance.now() - this.startTime) / 1000;
    const v = this.mach * this.c;  // source speed
    // Source position (loops left↔right across the canvas)
    const span = w - 100;
    const phase = (v * elapsed) % (2 * span);
    const sx = 50 + (phase < span ? phase : 2 * span - phase);
    const dir = phase < span ? 1 : -1;

    // Emit wavefronts at fixed intervals
    while (this.lastEmit + this.emitInterval < elapsed) {
      this.lastEmit += this.emitInterval;
      const t0 = this.lastEmit;
      const phaseAtT0 = (v * t0) % (2 * span);
      const sxAtT0 = 50 + (phaseAtT0 < span ? phaseAtT0 : 2 * span - phaseAtT0);
      this.wavefronts.push({ x: sxAtT0, t0 });
    }
    // Cull old ones
    this.wavefronts = this.wavefronts.filter((wf) => {
      const r = this.c * (elapsed - wf.t0);
      return r < w * 1.5;
    });

    // Wavefronts
    ctx.lineWidth = 1.2;
    for (const wf of this.wavefronts) {
      const r = this.c * (elapsed - wf.t0);
      const alpha = Math.max(0, 1 - r / (w * 0.9));
      ctx.strokeStyle = `rgba(26, 26, 46, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(wf.x, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Source marker (gold)
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(sx, cy, 9, 0, Math.PI * 2); ctx.fill();
    // Velocity arrow
    ctx.strokeStyle = theme.goldDeep;
    ctx.lineWidth = 2;
    const arrLen = Math.max(10, v * 0.4);
    ctx.beginPath();
    ctx.moveTo(sx, cy);
    ctx.lineTo(sx + dir * arrLen, cy);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath();
    ctx.moveTo(sx + dir * (arrLen + 5), cy);
    ctx.lineTo(sx + dir * arrLen, cy - 4);
    ctx.lineTo(sx + dir * arrLen, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Two stationary "observers" on left and right
    const drawObserver = (ox: number) => {
      ctx.fillStyle = theme.ink;
      ctx.fillRect(ox - 3, cy - 18, 6, 36);
    };
    drawObserver(60);
    drawObserver(w - 60);

    // Frequency multipliers (assume non-relativistic)
    const fLeftMult = 1 / (1 + dir * this.mach);      // observer behind ↔ depends on direction
    const fRightMult = 1 / (1 - dir * this.mach);

    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`f' = ${(dir > 0 ? fLeftMult : fRightMult).toFixed(2)} f₀`, 18, cy + 32);
    ctx.fillText(`f' = ${(dir > 0 ? fRightMult : fLeftMult).toFixed(2)} f₀`, w - 90, cy + 32);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`source Mach = ${this.mach.toFixed(2)}`, 16, 28);
    ctx.fillStyle = this.mach >= 1 ? theme.crimson : axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(this.mach >= 1 ? 'SUPERSONIC — Mach cone forms' :
                 this.mach > 0.7 ? 'STRONG DOPPLER — front compressed visibly' :
                 'SUBSONIC — gentle Doppler shift', 16, 50);
  }
}

window.addEventListener('DOMContentLoaded', () => new DopplerEffect());
