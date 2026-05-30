import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ShutterFreeze {
  private stage: CanvasStage;
  private speed = 500; // 1/speed seconds

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.speed = hydrateNumber('speed', 500);
    const s = document.getElementById('speed') as EncSlider;
    s.value = this.speed;
    s.addEventListener('input', (e) => { this.speed = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('speed', () => Math.round(this.speed));
    document.addEventListener('reset-params', () => { this.speed = 500; s.value = 500; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    // background scene (stays sharp at any shutter)
    ctx.fillStyle = '#9bb6cc'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2c6a3e'; ctx.fillRect(0, h * 0.65, w, h * 0.35);
    // distant mountains
    ctx.fillStyle = '#5a7491';
    ctx.beginPath(); ctx.moveTo(0, h * 0.65);
    ctx.lineTo(w * 0.25, h * 0.45); ctx.lineTo(w * 0.45, h * 0.6); ctx.lineTo(w * 0.6, h * 0.42);
    ctx.lineTo(w * 0.85, h * 0.58); ctx.lineTo(w, h * 0.5); ctx.lineTo(w, h * 0.65); ctx.closePath(); ctx.fill();

    // moving subject — a ball tracking a parabolic-ish arc across the frame
    const x0 = 60, x1 = w - 60, arcH = h * 0.25, baseY = h * 0.55;
    const subjectAt = (t: number) => ({
      x: x0 + (x1 - x0) * t,
      y: baseY - 4 * arcH * t * (1 - t),
    });
    // streak length: speed=2000 (1/2000s) → almost no smear; speed=4 (1/4s) → big smear
    const expSec = 1 / this.speed;
    const baseSweep = Math.min(1, expSec * 2.5);  // fraction of arc covered during exposure
    const ghosts = Math.max(1, Math.round(40 * baseSweep));
    const centreT = 0.5;
    const sweepStart = Math.max(0, centreT - baseSweep / 2);
    const sweepEnd = Math.min(1, centreT + baseSweep / 2);

    for (let g = 0; g < ghosts; g++) {
      const t = sweepStart + (sweepEnd - sweepStart) * (g / Math.max(1, ghosts - 1));
      const { x, y } = subjectAt(t);
      const alpha = ghosts === 1 ? 1 : 0.18 + 0.5 * (1 - Math.abs(g / (ghosts - 1) - 0.5) * 2);
      ctx.fillStyle = `rgba(232,90,46,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    }

    // shutter readout box
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 20, 180, 40);
    ctx.fillStyle = '#f4ecd6'; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`shutter  1/${Math.round(this.speed)} s`, 32, 46);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.speed >= 1000
      ? 'fast — the ball is a single frozen point'
      : this.speed >= 250 ? 'medium — a hint of smear, mostly sharp'
      : this.speed >= 60 ? 'slow — the motion paints a clear streak'
      : 'very slow — a long arc of light marks the path', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ShutterFreeze());
