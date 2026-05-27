import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Planet { name: string; auDist: number; lightMin: number }

// Astronomical distances in light-minutes (NASA fact sheets).
const PLANETS: Planet[] = [
  { name: 'Sun',     auDist: 0,    lightMin: 0 },
  { name: 'Mercury', auDist: 0.39, lightMin: 3.2 },
  { name: 'Venus',   auDist: 0.72, lightMin: 6.0 },
  { name: 'Earth',   auDist: 1.0,  lightMin: 8.3 },
  { name: 'Mars',    auDist: 1.52, lightMin: 12.7 },
  { name: 'Jupiter', auDist: 5.20, lightMin: 43.2 },
  { name: 'Saturn',  auDist: 9.54, lightMin: 79.3 },
  { name: 'Uranus',  auDist: 19.2, lightMin: 159 },
  { name: 'Neptune', auDist: 30.1, lightMin: 250 },
];

class LightSpeedFinite {
  private stage: CanvasStage;
  private au = 1.0;
  private lastTime = 0;
  private pulseStart = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.au = hydrateNumber('au', 100) / 100;
    (document.getElementById('au') as EncSlider).value = this.au * 100;
    registerStateParam('au', () => Math.round(this.au * 100));

    (document.getElementById('au') as EncSlider).addEventListener('input', (e) => {
      this.au = (e.target as EncSlider).value / 100;
      this.pulseStart = performance.now();
      notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.au = 1.0;
      (document.getElementById('au') as EncSlider).value = 100;
      this.pulseStart = performance.now();
      notifyStateChange();
    });
    this.pulseStart = performance.now();
    this.animate(performance.now());
  }

  private animate = (now: number) => {
    this.lastTime = now;
    this.draw();
    requestAnimationFrame(this.animate);
  };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const padL = 80;
    const padR = 80;
    const cy = h / 2;
    const xMax = w - padR;

    // log-distance mapping so Neptune fits beside Earth
    const auMax = 30.5;
    const xOf = (au: number) => padL + Math.log10(1 + 30 * au / auMax) / Math.log10(31) * (xMax - padL);
    const lightMinAtAu = (au: number) => 8.3 * au; // approximate (Earth = 8.3 light-min/AU)

    // Axis baseline
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, cy);
    ctx.lineTo(xMax, cy);
    ctx.stroke();

    // Planet markers
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    PLANETS.forEach((p, i) => {
      const x = xOf(p.auDist);
      ctx.fillStyle = i === 0 ? theme.goldDeep : theme.ink;
      const r = i === 0 ? 12 : Math.max(3, 8 - Math.log10(p.auDist + 1.1));
      ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = axisStyle.label;
      ctx.fillText(p.name, x - 16, cy + 32);
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = theme.inkMute;
      ctx.fillText(`${p.lightMin.toFixed(1)} lm`, x - 16, cy + 46);
      ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    });

    // Pulse animation — travel from sun to current AU at light speed
    // We map "real" travel duration as: 5 seconds per 30 AU (slow it down for visibility)
    const speedSec = 5 * (this.au / 30);
    const elapsed = ((this.lastTime - this.pulseStart) / 1000) % Math.max(speedSec * 1.6, 1);
    const fraction = Math.min(elapsed / speedSec, 1);
    const xSun = xOf(0);
    const xTarget = xOf(this.au);
    const xPulse = xSun + (xTarget - xSun) * fraction;

    // Pulse glow
    const glow = ctx.createRadialGradient(xPulse, cy, 0, xPulse, cy, 24);
    glow.addColorStop(0, theme.goldAlpha(0.9));
    glow.addColorStop(1, theme.goldAlpha(0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(xPulse, cy, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(xPulse, cy, 5, 0, Math.PI * 2); ctx.fill();

    // Target marker
    ctx.strokeStyle = theme.crimson;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xTarget, cy - 28); ctx.lineTo(xTarget, cy + 28);
    ctx.stroke();

    // Readout
    const lm = lightMinAtAu(this.au);
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`distance = ${this.au.toFixed(2)} AU`, 16, 32);
    ctx.fillText(`light travel time = ${lm.toFixed(1)} min  (${(lm * 60).toFixed(0)} s)`, 16, 54);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('c = 299,792 km/s · 1 AU ≈ 8.3 light-minutes', 16, 74);
  }
}

window.addEventListener('DOMContentLoaded', () => new LightSpeedFinite());
