import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type Fibre = 'cotton' | 'wool' | 'silk';
const FIBRES: Fibre[] = ['cotton', 'wool', 'silk'];

// Adsorption capacity (relative max). Wool/silk (protein) > cotton (cellulose) for natural dyes.
const CAPACITY: Record<Fibre, number> = { cotton: 0.55, wool: 0.95, silk: 0.85 };
// Rate constants (Langmuir kinetics 1/t_half).
const RATE: Record<Fibre, number> = { cotton: 0.025, wool: 0.045, silk: 0.040 };

const DYE_COLOUR: [number, number, number] = [180, 30, 60]; // madder-like red

class NaturalDyeing {
  private stage: CanvasStage;
  private t = 60;
  private fibre: Fibre = 'wool';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 60);
    const raw = hydrateFromUrl('fibre');
    if (raw && (FIBRES as string[]).includes(raw)) this.fibre = raw as Fibre;
    const sT = document.getElementById('t') as EncSlider; sT.value = this.t;
    sT.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tF = document.getElementById('fibre') as EncToggle; tF.value = this.fibre;
    tF.addEventListener('change', (e) => { this.fibre = (e as CustomEvent).detail.value as Fibre; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    registerStateParam('fibre', () => this.fibre);
    document.addEventListener('reset-params', () => { this.t = 60; this.fibre = 'wool'; sT.value = 60; tF.value = 'wool'; this.draw(); notifyStateChange(); });
  }

  // Langmuir: fibre saturation θ(t) = θ_max * (1 - exp(-k*t))
  private uptake(t: number, fibre: Fibre): number {
    return CAPACITY[fibre] * (1 - Math.exp(-RATE[fibre] * t));
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const uptakeNow = this.uptake(this.t, this.fibre);
    const bathColour = Math.max(0.1, 1 - uptakeNow / (CAPACITY.wool + 0.05));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`fibre = ${this.fibre} · time = ${this.t}% · uptake θ = ${uptakeNow.toFixed(2)} (of max ${CAPACITY[this.fibre].toFixed(2)})`, M, M);

    // Left: bath jar; Right: fibre swatch
    const jarX = M + 40, jarY = M + 50, jarW = 160, jarH = 220;
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2;
    g.strokeRect(jarX, jarY, jarW, jarH);
    g.fillStyle = `rgb(${Math.round(DYE_COLOUR[0] * bathColour + 230 * (1 - bathColour))},${Math.round(DYE_COLOUR[1] * bathColour + 220 * (1 - bathColour))},${Math.round(DYE_COLOUR[2] * bathColour + 220 * (1 - bathColour))})`;
    g.fillRect(jarX + 2, jarY + jarH * 0.15, jarW - 4, jarH - 8 - jarH * 0.15);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('dye bath', jarX + jarW / 2, jarY - 6);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
    g.fillText(`fades as fibre absorbs`, jarX + jarW / 2, jarY + jarH + 16);

    // Fibre swatch
    const fx = M + 280, fy = jarY, fw = 200, fh = jarH;
    const intensity = uptakeNow / CAPACITY.wool;
    g.fillStyle = `rgb(${Math.round(DYE_COLOUR[0] * intensity + 240 * (1 - intensity))},${Math.round(DYE_COLOUR[1] * intensity + 235 * (1 - intensity))},${Math.round(DYE_COLOUR[2] * intensity + 235 * (1 - intensity))})`;
    g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(fx, fy, fw, fh);
    // Fibre texture
    g.strokeStyle = `rgba(0,0,0,${0.07 + intensity * 0.1})`; g.lineWidth = 1;
    for (let i = 0; i < fh; i += 6) {
      g.beginPath(); g.moveTo(fx, fy + i + (Math.sin(i * 0.3) * 2)); g.lineTo(fx + fw, fy + i + (Math.cos(i * 0.2) * 2)); g.stroke();
    }
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText(this.fibre, fx + fw / 2, fy - 6);

    // Right panel: uptake-time curves for all fibres
    const px = fx + fw + 40, py = fy, pw = w - px - M, ph = fh;
    if (pw > 100) {
      g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
      g.fillText('uptake θ vs time · Langmuir kinetics', px + pw / 2, py - 6);
      g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif';
      g.fillText('time →', px + pw / 2, py + ph + 16);

      const colours: Record<Fibre, string> = { cotton: '#a3132d', wool: '#1f567a', silk: '#1f7a4d' };
      for (const fb of FIBRES) {
        g.strokeStyle = colours[fb]; g.lineWidth = fb === this.fibre ? 2.5 : 1.5;
        g.beginPath();
        for (let tt = 0; tt <= 100; tt += 2) {
          const X = px + (tt / 100) * pw;
          const Y = py + ph - (this.uptake(tt, fb) / 1.0) * ph;
          if (tt === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
        }
        g.stroke();
        // Label at right end
        const yEnd = py + ph - (this.uptake(100, fb) / 1.0) * ph;
        g.fillStyle = colours[fb]; g.font = '11px serif'; g.textAlign = 'left';
        g.fillText(fb, px + pw + 4, yEnd + 4);
      }
      // Marker for current
      const X = px + (this.t / 100) * pw;
      const Y = py + ph - (uptakeNow / 1.0) * ph;
      g.fillStyle = theme.ink; g.beginPath(); g.arc(X, Y, 5, 0, Math.PI * 2); g.fill();
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Physical adsorption only — no covalent bond. Wash with detergent and natural dyes leach back out. Mordant compounds fix the dye through a metal-ion bridge (see mordant-ligands).', M, h - M);
  }
}

new NaturalDyeing();
