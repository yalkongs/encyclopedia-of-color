import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { jonesFromAmpPhase, stokes, degreeOfPolarization, type Stokes } from '@core/math/polarization';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class StokesViz {
  private stage: CanvasStage;
  private ax = 0.90;
  private ay = 0.60;
  private delta = 60;
  private depol = 0.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ax = hydrateNumber('ax', 0.90);
    this.ay = hydrateNumber('ay', 0.60);
    this.delta = hydrateNumber('delta', 60);
    this.depol = hydrateNumber('depol', 0.0);
    (document.getElementById('ax') as EncSlider).value = this.ax;
    (document.getElementById('ay') as EncSlider).value = this.ay;
    (document.getElementById('delta') as EncSlider).value = this.delta;
    (document.getElementById('depol') as EncSlider).value = this.depol;
    registerStateParam('ax', () => this.ax);
    registerStateParam('ay', () => this.ay);
    registerStateParam('delta', () => this.delta);
    registerStateParam('depol', () => this.depol);
    for (const id of ['ax', 'ay', 'delta', 'depol']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'ax') this.ax = v;
        else if (id === 'ay') this.ay = v;
        else if (id === 'delta') this.delta = v;
        else this.depol = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.ax = 0.90; this.ay = 0.60; this.delta = 60; this.depol = 0.0;
      (document.getElementById('ax') as EncSlider).value = 0.90;
      (document.getElementById('ay') as EncSlider).value = 0.60;
      (document.getElementById('delta') as EncSlider).value = 60;
      (document.getElementById('depol') as EncSlider).value = 0.0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pure = stokes(jonesFromAmpPhase(this.ax, this.ay, this.delta * DEG));
    // Depolarization scales the polarized part, keeping S0.
    const p = 1 - this.depol;
    const s: Stokes = { S0: pure.S0, S1: pure.S1 * p, S2: pure.S2 * p, S3: pure.S3 * p };
    const dop = degreeOfPolarization(s);

    // Bar chart for S0..S3.
    const labels = ['S₀  intensity', 'S₁  H ↔ V', 'S₂  +45 ↔ −45', 'S₃  R ↔ L circular'];
    const vals = [s.S0, s.S1, s.S2, s.S3];
    const maxAbs = Math.max(1e-6, s.S0);
    const x0 = w * 0.30;
    const barMaxW = w * 0.30;
    const rowH = h * 0.13;
    const top = h * 0.18;

    for (let i = 0; i < 4; i++) {
      const cy = top + i * rowH;
      // Zero axis.
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, cy - rowH * 0.35); ctx.lineTo(x0, cy + rowH * 0.35); ctx.stroke();
      // Bar.
      const v = vals[i];
      const bw = (v / maxAbs) * barMaxW;
      ctx.fillStyle = i === 0 ? theme.slate : (v >= 0 ? theme.goldDeep : theme.crimson);
      ctx.fillRect(x0, cy - rowH * 0.22, bw, rowH * 0.44);
      // Label + value.
      ctx.fillStyle = theme.ink; ctx.font = '500 13px Inter, sans-serif';
      ctx.fillText(labels[i], w * 0.04, cy + 4);
      ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(v.toFixed(3), x0 + bw + (bw >= 0 ? 6 : -42), cy + 4);
    }

    // Scale ticks at ±S0.
    ctx.strokeStyle = theme.inkAlpha(0.2);
    ctx.beginPath(); ctx.moveTo(x0 + barMaxW, top - rowH * 0.4); ctx.lineTo(x0 + barMaxW, top + 3 * rowH + rowH * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 - barMaxW, top - rowH * 0.4); ctx.lineTo(x0 - barMaxW, top + 3 * rowH + rowH * 0.4); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`+S₀`, x0 + barMaxW - 6, top - rowH * 0.5);
    ctx.fillText(`−S₀`, x0 - barMaxW - 6, top - rowH * 0.5);

    // DOP + classification.
    let kind: string;
    if (dop < 0.02) kind = 'unpolarized';
    else if (dop > 0.98) kind = 'fully polarized';
    else kind = 'partially polarized';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`degree of polarization = ${(dop * 100).toFixed(0)}%  (${kind})`, w * 0.04, h * 0.86);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('depolarization mixes in unpolarized light, shrinking S₁,S₂,S₃ while S₀ holds', w * 0.04, h * 0.86 + 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new StokesViz());
