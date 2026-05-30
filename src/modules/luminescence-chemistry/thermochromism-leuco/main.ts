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

type Dye = 'CVL-blue' | 'fluoran-red' | 'fluoran-black';
const DYES: Dye[] = ['CVL-blue', 'fluoran-red', 'fluoran-black'];
const INFO: Record<Dye, { rgb: [number, number, number]; melt: number }> = {
  'CVL-blue':     { rgb: [50, 60, 150],  melt: 30 },
  'fluoran-red':  { rgb: [200, 50, 70],  melt: 28 },
  'fluoran-black':{ rgb: [40, 40, 50],   melt: 33 },
};

function colourFraction(T: number, melt: number): number {
  // Sigmoid around melt
  return 1 / (1 + Math.exp((T - melt) * 1.5));
}

class Thermo {
  private stage: CanvasStage;
  private T = 25;
  private dye: Dye = 'CVL-blue';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.T = hydrateNumber('T', 25);
    const raw = hydrateFromUrl('dye');
    if (raw && (DYES as string[]).includes(raw)) this.dye = raw as Dye;
    const sT = document.getElementById('T') as EncSlider; sT.value = this.T;
    sT.addEventListener('input', (e) => { this.T = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tD = document.getElementById('dye') as EncToggle; tD.value = this.dye;
    tD.addEventListener('change', (e) => { this.dye = (e as CustomEvent).detail.value as Dye; this.draw(); notifyStateChange(); });
    registerStateParam('T', () => Math.round(this.T));
    registerStateParam('dye', () => this.dye);
    document.addEventListener('reset-params', () => { this.T = 25; this.dye = 'CVL-blue'; sT.value = 25; tD.value = 'CVL-blue'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.dye];
    const f = colourFraction(this.T, i.melt);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`T = ${this.T} °C · wax melt point = ${i.melt} °C · colour fraction = ${f.toFixed(2)}`, M, M);

    // Swatch
    const r = i.rgb[0] * f + 240 * (1 - f);
    const gn = i.rgb[1] * f + 235 * (1 - f);
    const b = i.rgb[2] * f + 230 * (1 - f);
    g.fillStyle = `rgb(${Math.round(r)},${Math.round(gn)},${Math.round(b)})`;
    g.fillRect(M + 30, M + 50, 280, 200);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 30, M + 50, 280, 200);

    // Transition curve
    const px = M + 350, py = M + 50, pw = w - px - M, ph = 200;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('colour fraction vs T (sharp wax melt)', px + pw / 2, py - 6);
    const X = (T: number) => px + ((T - 10) / 50) * pw;
    const Y = (v: number) => py + (1 - v) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let T = 10; T <= 60; T += 0.5) {
      const X0 = X(T), Y0 = Y(colourFraction(T, i.melt));
      if (T === 10) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.T), Y(f), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const T of [10, 25, 35, 50]) g.fillText(`${T}°C`, X(T), py + ph + 14);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Mood rings, baby-bottle indicators, thermal receipt paper, and re-writable optical disks all use leuco-developer-wax thermochromism with different melt points.', M, h - M);
  }
}

new Thermo();
