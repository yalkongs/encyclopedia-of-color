import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { evanescentDecayDepth, frustratedTIR, DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class FtirTunneling {
  private stage: CanvasStage;
  private gap = 200;     // gap in nm
  private theta = 50;    // incidence angle in degrees (slightly past θ_c for glass-air)

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.gap = hydrateNumber('gap', 200);
    this.theta = hydrateNumber('theta', 50);
    (document.getElementById('gap') as EncSlider).value = this.gap;
    (document.getElementById('theta') as EncSlider).value = this.theta;
    registerStateParam('gap', () => this.gap);
    registerStateParam('theta', () => this.theta);
    for (const id of ['gap', 'theta']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'gap') this.gap = v; else this.theta = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.gap = 200; this.theta = 50;
      (document.getElementById('gap') as EncSlider).value = 200;
      (document.getElementById('theta') as EncSlider).value = 50;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h / 2;
    const lambda = 550;            // nm reference
    const t = this.theta * DEG;
    const dp = evanescentDecayDepth(lambda, 1.5, 1.0, t);
    const T = dp === null ? 0 : frustratedTIR(this.gap, dp);
    const R = 1 - T;

    // Visualisation: gap pixel scale — show 0..500 nm as h/3
    const pxPerNm = (h / 3) / 500;
    const gapPx = this.gap * pxPerNm;
    const prism1Top = cy - 100;
    const prism1Bot = cy;
    const prism2Top = cy + gapPx;

    // Prism 1 (top)
    ctx.fillStyle = theme.slateAlpha(0.18);
    ctx.fillRect(60, prism1Top, w - 120, 100);
    ctx.strokeStyle = theme.inkAlpha(0.4);
    ctx.strokeRect(60, prism1Top, w - 120, 100);
    // Prism 2 (bottom) — only drawn if gap > 0
    if (gapPx > 4) {
      ctx.fillStyle = theme.slateAlpha(0.18);
      ctx.fillRect(60, prism2Top, w - 120, 100);
      ctx.strokeStyle = theme.inkAlpha(0.4);
      ctx.strokeRect(60, prism2Top, w - 120, 100);
    }
    // Air gap label
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`gap d = ${this.gap} nm`, w - 200, cy + gapPx / 2 + 4);

    // Evanescent field in the air gap
    if (dp !== null) {
      const dpPx = (dp / 500) * (h / 3);  // same scale as gap
      const evGradWidth = w - 140;
      for (let z = 0; z < gapPx; z += 1) {
        const amp = Math.exp(-z / Math.max(0.5, dpPx));
        ctx.fillStyle = `rgba(184, 146, 76, ${amp * 0.55})`;
        ctx.fillRect(70, prism1Bot + z, evGradWidth, 1);
      }
    }

    // Incident ray inside prism 1 (just hitting the interface)
    const cxHit = w * 0.4;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cxHit - 60, prism1Top + 50 - 60 * Math.tan(t));
    ctx.lineTo(cxHit, prism1Bot);
    ctx.stroke();
    // Reflected ray (intensity ∝ R)
    ctx.strokeStyle = `rgba(168, 50, 50, ${0.25 + R * 0.7})`;
    ctx.lineWidth = 1 + R * 2;
    ctx.beginPath();
    ctx.moveTo(cxHit, prism1Bot);
    ctx.lineTo(cxHit + 90, prism1Top + 50 - 90 * Math.tan(t));
    ctx.stroke();
    // Transmitted ray into prism 2 (intensity ∝ T)
    if (T > 0.01 && gapPx > 4) {
      ctx.strokeStyle = `rgba(74, 90, 107, ${0.25 + T * 0.7})`;
      ctx.lineWidth = 1 + T * 2;
      ctx.beginPath();
      ctx.moveTo(cxHit, prism2Top);
      ctx.lineTo(cxHit + 90, prism2Top + 90 * Math.tan(t));
      ctx.stroke();
    }

    // Transmittance bar
    const barX = w - 70, barY0 = h - 70, barH = h * 0.45;
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.strokeRect(barX, barY0 - barH, 30, barH);
    ctx.fillStyle = theme.crimson;
    ctx.fillRect(barX + 2, barY0 - barH * T, 26, barH * T);
    ctx.fillStyle = axisStyle.label;
    ctx.fillText('T', barX + 8, barY0 + 16);
    ctx.fillText('1.0', barX - 22, barY0 - barH + 4);
    ctx.fillText('0.0', barX - 22, barY0 + 4);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ = ${this.theta}°    gap d = ${this.gap} nm`, 16, 30);
    ctx.fillText(`λ = ${lambda} nm    d_p = ${dp ? dp.toFixed(0) : '—'} nm`, 16, 52);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`T ≈ exp(−2 d / d_p) = ${(T * 100).toFixed(1)} %`, 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new FtirTunneling());
