import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Amethyst {
  private stage: CanvasStage;
  private dose = 60;
  private T = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dose = hydrateNumber('dose', 60);
    this.T = hydrateNumber('T', 0);
    const sD = document.getElementById('dose') as EncSlider; sD.value = this.dose;
    sD.addEventListener('input', (e) => { this.dose = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sT = document.getElementById('T') as EncSlider; sT.value = this.T;
    sT.addEventListener('input', (e) => { this.T = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dose', () => Math.round(this.dose));
    registerStateParam('T', () => Math.round(this.T));
    document.addEventListener('reset-params', () => { this.dose = 60; this.T = 0; sD.value = 60; sT.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const survives = Math.max(0, 1 - this.T / 350);
    const intensity = (this.dose / 100) * survives;
    const citrineFrac = Math.max(0, (this.T - 350) / 250);

    // Purple amethyst + citrine orange blend
    const amR = 130, amG = 60, amB = 170;
    const ciR = 230, ciG = 160, ciB = 60;
    const clR = 240, clG = 240, clB = 230;
    let r = clR + (amR - clR) * intensity + (ciR - clR) * citrineFrac;
    let gn = clG + (amG - clG) * intensity + (ciG - clG) * citrineFrac;
    let b = clB + (amB - clB) * intensity + (ciB - clB) * citrineFrac;
    r = Math.min(255, r); gn = Math.min(255, gn); b = Math.min(255, b);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`dose = ${this.dose}% · T = ${this.T} °C · phase: ${citrineFrac > 0.3 ? 'citrine' : intensity > 0.4 ? 'amethyst' : 'clear quartz'}`, M, M);

    // Crystal swatch (hexagonal prism face)
    const cx = w / 2, cy = M + 200, R = 150;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.6;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = `rgb(${Math.round(r)},${Math.round(gn)},${Math.round(b)})`; g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2; g.stroke();

    // Reaction equation
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('[FeO₄]⁻ + radiation → [FeO₄]⁰ + e⁻  (purple amethyst centre)', cx, cy + R * 0.6 + 30);
    g.fillStyle = theme.inkAlpha(0.7);
    g.fillText('heat → Fe³⁺ trapped distinctly → orange citrine', cx, cy + R * 0.6 + 46);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Both colours coexist as ametrine when one half of a crystal is heated by hydrothermal flow during growth — Bolivia is the famous source.', M, h - M);
  }
}

new Amethyst();
