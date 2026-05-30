import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class AgeYellow {
  private stage: CanvasStage;
  private age = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.age = hydrateNumber('age', 50);
    const s = document.getElementById('age') as EncSlider; s.value = this.age;
    s.addEventListener('input', (e) => { this.age = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('age', () => Math.round(this.age));
    document.addEventListener('reset-params', () => { this.age = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const yellow = Math.max(0, (this.age - 20) / 70);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`age = ${this.age} y · yellowing index = ${yellow.toFixed(2)}`, M, M);

    // Lens swatch (transparent → yellow)
    const cx = M + 130, cy = M + 150;
    g.fillStyle = `rgba(220,${Math.round(220 - yellow * 100)},${Math.round(180 - yellow * 130)},${0.5 + yellow * 0.5})`;
    g.beginPath(); g.ellipse(cx, cy, 110, 65, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('crystalline lens', cx, cy + 80);

    // Transmittance plot
    const px = cx + 160, py = M + 60, pw = w - px - M, ph = 180;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('lens transmittance vs λ', px + pw / 2, py - 6);
    for (let i = 0; i < pw; i++) {
      const lam = 380 + (i / pw) * 320;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(px + i, py, 1, ph);
    }
    // Yellowing absorption tail (blue)
    for (let i = 0; i < pw; i++) {
      const lam = 380 + (i / pw) * 320;
      const a = yellow * Math.exp(-Math.pow((lam - 380) / 90, 2));
      if (a > 0.02) { g.fillStyle = `rgba(0,0,0,${a * 0.85})`; g.fillRect(px + i, py, 1, ph); }
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Cataract surgery replaces the yellowed lens with a clear IOL — patients often report "blue colours look bright again". A subjective experiment in pigment optics.', M, h - M);
  }
}

new AgeYellow();
