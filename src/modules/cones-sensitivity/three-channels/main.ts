import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { lCone, mCone, sCone } from '@core/math/cone-fundamentals';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Monochromatic primaries (dominant wavelengths) and their cone responses.
const PRIMARIES = { r: 610, g: 549, b: 465 };
const W = {
  r: { L: lCone(PRIMARIES.r), M: mCone(PRIMARIES.r), S: sCone(PRIMARIES.r) },
  g: { L: lCone(PRIMARIES.g), M: mCone(PRIMARIES.g), S: sCone(PRIMARIES.g) },
  b: { L: lCone(PRIMARIES.b), M: mCone(PRIMARIES.b), S: sCone(PRIMARIES.b) },
};
const DEFAULTS = { r: 70, g: 55, b: 30 };
const BAR_COLOR = { L: '#c0392b', M: '#2f8f4e', S: '#2b6cb0' };

class ThreeChannels {
  private stage: CanvasStage;
  private r = DEFAULTS.r; private g = DEFAULTS.g; private b = DEFAULTS.b;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.r = hydrateNumber('r', DEFAULTS.r);
    this.g = hydrateNumber('g', DEFAULTS.g);
    this.b = hydrateNumber('b', DEFAULTS.b);
    for (const id of ['r', 'g', 'b'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.r = DEFAULTS.r; this.g = DEFAULTS.g; this.b = DEFAULTS.b;
      for (const id of ['r', 'g', 'b'] as const) (document.getElementById(id) as EncSlider).value = DEFAULTS[id];
      this.draw(); notifyStateChange();
    });
  }

  private lms() {
    const r = this.r / 100, g = this.g / 100, b = this.b / 100;
    return {
      L: r * W.r.L + g * W.g.L + b * W.b.L,
      M: r * W.r.M + g * W.g.M + b * W.b.M,
      S: r * W.r.S + g * W.g.S + b * W.b.S,
    };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // --- Mixed-colour swatch (top). ---
    const sx = w * 0.1, sy = h * 0.1, sw = w * 0.8, sh = h * 0.34;
    ctx.fillStyle = `rgb(${Math.round(this.r * 2.55)},${Math.round(this.g * 2.55)},${Math.round(this.b * 2.55)})`;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2; ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('additive mix of three primaries', sx + sw / 2, sy + sh + 16);
    ctx.textAlign = 'left';

    // --- LMS bars (bottom). ---
    const lms = this.lms();
    const maxV = Math.max(0.001, W.r.L + W.g.L + W.b.L, W.r.M + W.g.M + W.b.M, W.r.S + W.g.S + W.b.S);
    const order: Array<'L' | 'M' | 'S'> = ['L', 'M', 'S'];
    const baseY = h * 0.6, gap = h * 0.1, barX = w * 0.22, barMaxW = w * 0.6;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(barX, baseY - 18); ctx.lineTo(barX, baseY + gap * 2 + 18); ctx.stroke();

    order.forEach((k, i) => {
      const y = baseY + i * gap;
      const frac = lms[k] / maxV;
      ctx.fillStyle = BAR_COLOR[k];
      ctx.fillRect(barX, y - 12, frac * barMaxW, 24);
      ctx.fillStyle = theme.ink; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(k, barX - 10, y + 5);
      ctx.fillStyle = theme.inkMute; ctx.font = '12px JetBrains Mono, monospace'; ctx.textAlign = 'left';
      ctx.fillText(lms[k].toFixed(3), barX + frac * barMaxW + 8, y + 4);
    });
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('primaries shown at their dominant wavelengths · R 610 · G 549 · B 465 nm', w * 0.1, h * 0.95);
  }
}
window.addEventListener('DOMContentLoaded', () => new ThreeChannels());
