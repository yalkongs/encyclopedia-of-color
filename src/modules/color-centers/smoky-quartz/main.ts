import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SmokyQuartz {
  private stage: CanvasStage;
  private dose = 50;
  private T = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dose = hydrateNumber('dose', 50);
    this.T = hydrateNumber('T', 0);
    const sD = document.getElementById('dose') as EncSlider; sD.value = this.dose;
    sD.addEventListener('input', (e) => { this.dose = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sT = document.getElementById('T') as EncSlider; sT.value = this.T;
    sT.addEventListener('input', (e) => { this.T = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dose', () => Math.round(this.dose));
    registerStateParam('T', () => Math.round(this.T));
    document.addEventListener('reset-params', () => { this.dose = 50; this.T = 0; sD.value = 50; sT.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Effective hole-centre density: dose × anneal-survival
    const annealSurvival = Math.max(0, 1 - this.T / 400);
    const intensity = (this.dose / 100) * annealSurvival;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`dose = ${this.dose}% · T_anneal = ${this.T} °C · hole-centre density = ${(intensity * 100).toFixed(0)}%`, M, M);

    // Crystal as a hexagonal shape
    const cx = w / 2, cy = M + 200;
    const R = 150;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.6;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    // Colour: smoky brown blend with clear
    const r = Math.round(240 - intensity * 180);
    const gn = Math.round(240 - intensity * 195);
    const b = Math.round(220 - intensity * 175);
    g.fillStyle = `rgb(${r},${gn},${b})`; g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2; g.stroke();

    // Mechanism caption
    const my = cy + R * 0.6 + 30;
    g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'center';
    if (intensity > 0.5) g.fillText('paramagnetic [AlO₄]⁰ hole centres absorb across the visible → smoky brown', cx, my);
    else if (intensity > 0.1) g.fillText('partial colour — many electrons still in place', cx, my);
    else g.fillText('colourless — either no dose or fully annealed', cx, my);

    // Reaction arrow
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    g.fillText('[AlO₄·H]⁻ + radiation → [AlO₄]⁰ + H⁰ + e⁻  (cause #8)', cx, my + 18);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Industrial smoky quartz for jewellery is made by gamma-irradiating clear Brazilian rock crystal; the same crystal anneals back to colourless in a kiln.', M, h - M);
  }
}

new SmokyQuartz();
