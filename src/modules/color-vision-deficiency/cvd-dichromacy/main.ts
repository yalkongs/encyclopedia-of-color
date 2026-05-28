import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { simulateBrettel, type CVDType } from '@core/math/cvd';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: r + m, g: g + m, b: b + m };
}
const css = (c: { r: number; g: number; b: number }) => `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;

const N = 48;

class CvdDichromacy {
  private stage: CanvasStage;
  private type: CVDType = 'deuteranopia';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.type = (hydrateFromUrl('type') as CVDType) ?? 'deuteranopia';
    (document.getElementById('type') as EncToggle).value = this.type;
    registerStateParam('type', () => this.type);
    (document.getElementById('type') as EncToggle).addEventListener('change', (e) => {
      this.type = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.type = 'deuteranopia';
      (document.getElementById('type') as EncToggle).value = 'deuteranopia';
      this.draw(); notifyStateChange();
    });
  }

  private wheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, sim: boolean) {
    const inner = R * 0.42;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / N) * 2 * Math.PI - Math.PI / 2;
      let c = hslToRgb((i / N) * 360, 0.95, 0.5);
      if (sim) c = simulateBrettel(c, this.type);
      ctx.fillStyle = css(c);
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, inner, a1, a0, true); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, 2 * Math.PI); ctx.stroke();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const R = Math.min(w * 0.21, h * 0.36), cy = h * 0.48;
    this.wheel(ctx, w * 0.3, cy, R, false);
    this.wheel(ctx, w * 0.7, cy, R, true);

    ctx.fillStyle = theme.inkMute; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('normal trichromat', w * 0.3, cy + R + 30);
    ctx.fillText(this.type, w * 0.7, cy + R + 30);
    ctx.textAlign = 'left';

    const conf = this.type === 'tritanopia' ? 'blue and yellow merge' : 'red and green merge';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${this.type}: ${conf} along the confusion line`, w / 2, h - 14);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new CvdDichromacy());
