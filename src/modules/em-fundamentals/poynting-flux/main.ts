import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { drawArrow3D, drawAxisTriad, cross3, magnitude3 } from '@core/render/em-vector';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PoyntingFlux {
  private stage: CanvasStage;
  private eMag = 1.0;            // E amplitude (normalised)
  private bMag = 1.0;            // B amplitude (normalised)

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.eMag = hydrateNumber('E', 100) / 100;
    this.bMag = hydrateNumber('B', 100) / 100;
    (document.getElementById('E') as EncSlider).value = this.eMag * 100;
    (document.getElementById('B') as EncSlider).value = this.bMag * 100;

    registerStateParam('E', () => Math.round(this.eMag * 100));
    registerStateParam('B', () => Math.round(this.bMag * 100));

    (document.getElementById('E') as EncSlider).addEventListener('input', (e) => {
      this.eMag = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    (document.getElementById('B') as EncSlider).addEventListener('input', (e) => {
      this.bMag = (e.target as EncSlider).value / 100; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.eMag = 1.0; this.bMag = 1.0;
      (document.getElementById('E') as EncSlider).value = 100;
      (document.getElementById('B') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const origin = { x: w * 0.42, y: h * 0.55 };
    const scale = Math.min(w, h) * 0.0035;
    const armLen = 90;

    drawAxisTriad(ctx, origin, armLen * 0.5 / scale, { alpha: 0.3 });

    const E = { x: 0, y: armLen * this.eMag, z: 0 };
    const B = { x: 0, y: 0, z: armLen * this.bMag };
    const S = cross3(E, B);
    // Normalize S length for display — proportional to E·B
    const SmagDisplay = magnitude3(S) * 0.012;   // empirical
    const Snorm = magnitude3(S) || 1;
    const Sdisp = { x: (S.x / Snorm) * SmagDisplay * 100, y: (S.y / Snorm) * SmagDisplay * 100, z: (S.z / Snorm) * SmagDisplay * 100 };

    drawArrow3D(ctx, origin, E, scale, theme.crimson, 3, 'E');
    drawArrow3D(ctx, origin, B, scale, theme.goldDeep, 3, 'B');
    drawArrow3D(ctx, origin, Sdisp, scale, theme.ink, 4, 'S = E × H/μ₀');

    // Intensity bar — right side
    const intensity = this.eMag * this.bMag;
    const barX = w - 80;
    const barY0 = h * 0.85;
    const barH = h * 0.55;
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.strokeRect(barX, barY0 - barH, 40, barH);
    ctx.fillStyle = theme.ink;
    ctx.fillRect(barX + 2, barY0 - barH * intensity, 36, barH * intensity);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('|S|', barX + 12, barY0 + 16);
    ctx.fillText('I_max', barX + 4, barY0 - barH - 4);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`|E| = ${this.eMag.toFixed(2)} · E₀`, 16, 28);
    ctx.fillText(`|B| = ${this.bMag.toFixed(2)} · B₀`, 16, 50);
    ctx.fillStyle = theme.ink;
    ctx.fillText(`|S| ∝ |E|·|B| = ${(this.eMag * this.bMag).toFixed(2)}`, 16, 72);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Intensity is the time-average of |S| over one cycle: ⟨S⟩ = ½·ε₀·c·E₀² .', 16, 94);
  }
}

window.addEventListener('DOMContentLoaded', () => new PoyntingFlux());
