import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface PigmentSpec {
  name: string;
  rate: number;  // σ·φ per nominal year of sunlight (k_year)
  rgb: [number, number, number];
}
const PIGS: PigmentSpec[] = [
  { name: 'alizarin (lake)',      rate: 0.005, rgb: [180, 50, 70] },
  { name: 'Prussian blue',         rate: 0.015, rgb: [30, 60, 130] },
  { name: 'sap green (lake)',      rate: 0.030, rgb: [80, 130, 60] },
];

function retained(rate: number, UV: number, yrs: number): number {
  return Math.exp(-rate * UV * yrs);
}

class UVPhoto {
  private stage: CanvasStage;
  private UV = 5;
  private years = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.UV = hydrateNumber('UV', 5);
    this.years = hydrateNumber('years', 50);
    const sU = document.getElementById('UV') as EncSlider; sU.value = this.UV;
    sU.addEventListener('input', (e) => { this.UV = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sY = document.getElementById('years') as EncSlider; sY.value = this.years;
    sY.addEventListener('input', (e) => { this.years = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('UV', () => Math.round(this.UV));
    registerStateParam('years', () => Math.round(this.years));
    document.addEventListener('reset-params', () => { this.UV = 5; this.years = 50; sU.value = 5; sY.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`UV exposure = ${this.UV}× normal sunlight · ${this.years} years elapsed`, M, M);

    // Three pigments — before/after swatches with retention bar
    const sy = M + 40;
    for (let i = 0; i < PIGS.length; i++) {
      const p = PIGS[i];
      const ret = retained(p.rate, this.UV, this.years);
      const py = sy + i * 70;
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
      g.fillText(p.name, M, py + 12);
      g.fillStyle = `rgb(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]})`;
      g.fillRect(M, py + 20, 100, 40);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, py + 20, 100, 40);
      g.fillStyle = `rgb(${Math.round(p.rgb[0] * ret + 240 * (1 - ret))},${Math.round(p.rgb[1] * ret + 235 * (1 - ret))},${Math.round(p.rgb[2] * ret + 230 * (1 - ret))})`;
      g.fillRect(M + 110, py + 20, 100, 40);
      g.strokeRect(M + 110, py + 20, 100, 40);
      // arrow
      g.fillStyle = theme.inkAlpha(0.7); g.font = '14px serif'; g.textAlign = 'center';
      g.fillText('→', M + 105, py + 45);
      // retention bar
      g.fillStyle = theme.inkAlpha(0.75); g.font = '11px monospace';
      g.fillText(`${(ret * 100).toFixed(0)}% retained · k=${(p.rate * 1e3).toFixed(1)}×10⁻³`, M + 230, py + 38);
    }

    // Right panel: decay curves
    const px = M + 500, py = sy, pw = w - px - M, ph = 220;
    if (pw > 100) {
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
      g.fillText('retained fraction vs years', px + pw / 2, py - 6);
      g.fillText('years →', px + pw / 2, py + ph + 16);

      const X = (t: number) => px + (t / 200) * pw;
      const Y = (r: number) => py + (1 - r) * ph;
      const colours = ['#a3132d', '#1f567a', '#1f7a4d'];
      for (let i = 0; i < PIGS.length; i++) {
        g.strokeStyle = colours[i]; g.lineWidth = 2;
        g.beginPath();
        for (let t = 0; t <= 200; t += 1) {
          const X0 = X(t), Y0 = Y(retained(PIGS[i].rate, this.UV, t));
          if (t === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
        }
        g.stroke();
      }
      // Current marker
      g.fillStyle = '#1a1a1a';
      for (let i = 0; i < PIGS.length; i++) {
        g.beginPath(); g.arc(X(this.years), Y(retained(PIGS[i].rate, this.UV, this.years)), 4, 0, Math.PI * 2); g.fill();
      }
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Lake pigments (organic dye + inert mineral) almost always fade faster than mineral pigments — cadmiums and cobalts can survive centuries; aniline dyes years.', M, h - M);
  }
}

new UVPhoto();
