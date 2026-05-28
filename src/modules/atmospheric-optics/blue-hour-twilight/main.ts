import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function mix(c1: number[], c2: number[], t: number): number[] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

interface PhaseInfo { name: string; color: string; }
function phaseOf(elev: number): PhaseInfo {
  if (elev > 0) return { name: 'Daytime / golden hour', color: '#b8924c' };
  const d = -elev;
  if (d < 6) return { name: 'Civil twilight · blue hour', color: '#4a5a8b' };
  if (d < 12) return { name: 'Nautical twilight', color: '#2a3a6b' };
  if (d < 18) return { name: 'Astronomical twilight', color: '#1a1a3e' };
  return { name: 'Night', color: '#0a0a1a' };
}

class TwilightViz {
  private stage: CanvasStage;
  private elev = -4;
  private az = 0.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.elev = hydrateNumber('elev', -4);
    this.az = hydrateNumber('az', 0.0);
    (document.getElementById('elev') as EncSlider).value = this.elev;
    (document.getElementById('az') as EncSlider).value = this.az;
    registerStateParam('elev', () => this.elev);
    registerStateParam('az', () => this.az);
    for (const id of ['elev', 'az']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'elev') this.elev = v; else this.az = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.elev = -4; this.az = 0.0;
      (document.getElementById('elev') as EncSlider).value = -4;
      (document.getElementById('az') as EncSlider).value = 0.0;
      this.draw(); notifyStateChange();
    });
  }

  /** Sky colour at normalised altitude alt∈[0,1] (0 horizon, 1 zenith). */
  private skyColor(alt: number): number[] {
    const elev = this.elev;
    const d = Math.max(0, -elev);                 // solar depression (deg)
    const bright = clamp01(1 - d / 18);           // 1 just after sunset → 0 at astro end
    const day = clamp01(elev / 6);                // 1 when sun ≥6° up

    // Toward-sun vs anti-solar blend.
    const antisolar = this.az;                    // 0 = sunset side, 1 = opposite

    // Zenith blue, darkening with depression.
    const zenithDay = [70, 130, 210];
    const zenithBlue = [30, 50, 110];
    const zenith = mix(mix(zenithBlue, [8, 10, 28], 1 - bright), zenithDay, day);

    // Horizon colour: warm glow on sunset side, cool on anti-solar.
    const glowSunset = mix([20, 25, 60], [255, 150, 60], bright);   // orange glow
    const glowDay = [200, 200, 220];
    const horizonSunset = mix(glowSunset, glowDay, day);

    // Anti-solar horizon: Earth's shadow (blue-grey) + Belt of Venus above it.
    const shadowTopAlt = clamp01(d / 18) * 0.5;   // shadow rises with depression
    let horizonAnti: number[];
    if (alt < shadowTopAlt) {
      horizonAnti = mix([40, 45, 70], [12, 12, 30], 1 - bright);   // dark earth shadow
    } else {
      // Belt of Venus pink band just above the shadow edge.
      const beltT = clamp01(1 - (alt - shadowTopAlt) / 0.25);
      const belt = mix(mix(zenithBlue, [12, 12, 30], 1 - bright), [230, 150, 170], beltT * bright);
      horizonAnti = belt;
    }

    const horizon = mix(horizonSunset, horizonAnti, antisolar);

    // Vertical blend horizon→zenith.
    return mix(horizon, zenith, Math.pow(alt, 0.8));
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const horizonY = h * 0.82;
    // Render sky as horizontal scanlines.
    for (let y = 0; y < horizonY; y++) {
      const alt = 1 - y / horizonY;
      const c = this.skyColor(alt);
      ctx.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
      ctx.fillRect(0, y, w, 1);
    }

    // Ground.
    ctx.fillStyle = '#15130f';
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Sun marker if above/near horizon and viewing sunset side.
    if (this.elev > -2 && this.az < 0.4) {
      const sunY = horizonY - (this.elev / 6) * (horizonY * 0.5);
      const sunX = w * 0.3;
      const p = phaseOf(this.elev);
      ctx.fillStyle = this.elev > 0 ? '#fff2c0' : '#ff9040';
      ctx.globalAlpha = clamp01(1 - this.az / 0.4);
      ctx.beginPath(); ctx.arc(sunX, Math.min(sunY, horizonY - 2), Math.min(w, h) * 0.04, 0, 2 * Math.PI); ctx.fill();
      ctx.globalAlpha = 1;
      void p;
    }

    // Earth-shadow edge marker on anti-solar side.
    const d = Math.max(0, -this.elev);
    if (this.az > 0.5 && d > 0 && d < 18) {
      const shadowTopAlt = clamp01(d / 18) * 0.5;
      const yEdge = (1 - shadowTopAlt) * horizonY;
      ctx.strokeStyle = 'rgba(248,242,228,0.4)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, yEdge); ctx.lineTo(w, yEdge); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(248,242,228,0.85)';
      ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
      ctx.fillText("Earth's shadow edge · Belt of Venus", 14, yEdge - 6);
    }

    // Phase + readout panel.
    const phase = phaseOf(this.elev);
    ctx.fillStyle = 'rgba(20,18,30,0.55)';
    ctx.fillRect(0, 0, w, 58);
    ctx.fillStyle = 'rgba(248,242,228,0.96)';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(phase.name, 14, 26);
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`solar elevation = ${this.elev.toFixed(2)}°`, 14, 48);
    ctx.fillText(this.az < 0.5 ? 'looking toward sunset' : 'looking anti-solar', w - 200, 48);
  }
}
window.addEventListener('DOMContentLoaded', () => new TwilightViz());
