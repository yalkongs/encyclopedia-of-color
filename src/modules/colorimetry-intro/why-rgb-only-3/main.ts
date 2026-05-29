import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, xyzToLab, deltaE76 } from '@core/math/colorimetry';
import { xyzFromLinearSrgb } from '@core/math/color-adaptation';
import { srgbToLinear } from '@core/math/oklab';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TARGET: [number, number, number] = [70, 150, 185]; // the colour to match
function rgbLab(r: number, g: number, b: number): Lab {
  const lin = [r, g, b].map((c) => srgbToLinear(c / 255)) as [number, number, number];
  return xyzToLab(xyzFromLinearSrgb(lin));
}
const TARGET_LAB = rgbLab(...TARGET);

class WhyThree {
  private stage: CanvasStage;
  private r = 120; private g = 120; private b = 120;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.r = hydrateNumber('r', 120); this.g = hydrateNumber('g', 120); this.b = hydrateNumber('b', 120);
    for (const k of ['r', 'g', 'b'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.r = 120; this.g = 120; this.b = 120;
      for (const k of ['r', 'g', 'b'] as const) (document.getElementById(k) as EncSlider).value = 120;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const dE = deltaE76(TARGET_LAB, rgbLab(this.r, this.g, this.b));
    const matched = dE < 2;

    // split disc: left = target, right = mix
    const cx = w * 0.5, cy = h * 0.46, R = Math.min(w, h) * 0.3;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    ctx.fillStyle = `rgb(${TARGET[0]},${TARGET[1]},${TARGET[2]})`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); ctx.closePath();
    ctx.fillStyle = `rgb(${this.r},${this.g},${this.b})`; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = theme.inkAlpha(matched ? 0.0 : 0.35); ctx.lineWidth = matched ? 0 : 1.5;
    if (!matched) { ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('target', cx - R * 0.5, cy + R + 18); ctx.fillText('your mix', cx + R * 0.5, cy + R + 18);

    ctx.textAlign = 'center';
    ctx.fillStyle = matched ? theme.slate : theme.crimson;
    ctx.font = '700 26px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(matched ? `matched · ΔE ${dE.toFixed(1)}` : `ΔE ${dE.toFixed(1)}`, cx, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new WhyThree());
