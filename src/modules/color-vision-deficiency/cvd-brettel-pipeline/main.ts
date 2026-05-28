import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { srgbToLms, projectDichromat, simulateBrettel, type CVDType } from '@core/math/cvd';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type RGB = { r: number; g: number; b: number };
function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: r + m, g: g + m, b: b + m };
}
const css = (c: RGB) => `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
const DEFICIENT: Record<Exclude<CVDType, 'normal'>, number> = { protanopia: 0, deuteranopia: 1, tritanopia: 2 };
const FORMULA: Record<Exclude<CVDType, 'normal'>, string> = {
  protanopia: 'L = 2.023·M − 2.526·S',
  deuteranopia: 'M = 0.494·L + 1.248·S',
  tritanopia: 'S = −0.396·L + 0.801·M',
};
const LABELS = ['L', 'M', 'S'];
const MAXLMS = 70;

class BrettelPipeline {
  private stage: CanvasStage;
  private hue = 20;
  private type: Exclude<CVDType, 'normal'> = 'deuteranopia';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 20);
    this.type = (hydrateFromUrl('type') as Exclude<CVDType, 'normal'>) ?? 'deuteranopia';
    (document.getElementById('hue') as EncSlider).value = this.hue;
    (document.getElementById('type') as EncToggle).value = this.type;
    registerStateParam('hue', () => this.hue);
    registerStateParam('type', () => this.type);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('type') as EncToggle).addEventListener('change', (e) => {
      this.type = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 20; this.type = 'deuteranopia';
      (document.getElementById('hue') as EncSlider).value = 20;
      (document.getElementById('type') as EncToggle).value = 'deuteranopia';
      this.draw(); notifyStateChange();
    });
  }

  private lmsBars(ctx: CanvasRenderingContext2D, x: number, y: number, bw: number, lms: number[], hi: number) {
    LABELS.forEach((lab, i) => {
      const by = y + i * 26;
      ctx.fillStyle = theme.ink; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(lab, x - 6, by + 13);
      ctx.fillStyle = theme.paperRecess; ctx.fillRect(x, by, bw, 18);
      ctx.fillStyle = i === hi ? theme.crimson : theme.slate;
      ctx.fillRect(x, by, Math.min(1, lms[i] / MAXLMS) * bw, 18);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x, by, bw, 18);
    });
    ctx.textAlign = 'left';
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const input = hslToRgb(this.hue, 0.9, 0.5);
    const lms = srgbToLms(input);
    const lmsP = projectDichromat(lms, this.type);
    const output = simulateBrettel(input, this.type);
    const di = DEFICIENT[this.type];

    const cy = h * 0.4;
    const xs = [w * 0.06, w * 0.30, w * 0.56, w * 0.82];
    const sw = w * 0.13, bw = w * 0.17;

    // Stage 1: input swatch.
    ctx.fillStyle = css(input); ctx.fillRect(xs[0], cy - sw / 2, sw, sw);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(xs[0], cy - sw / 2, sw, sw);
    // Stage 2: LMS bars.
    this.lmsBars(ctx, xs[1], cy - 39, bw, lms, -1);
    // Stage 3: projected LMS.
    this.lmsBars(ctx, xs[2], cy - 39, bw, lmsP, di);
    // Stage 4: output swatch.
    ctx.fillStyle = css(output); ctx.fillRect(xs[3], cy - sw / 2, sw, sw);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(xs[3], cy - sw / 2, sw, sw);

    // Stage labels + arrows.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ['sRGB in', 'cone LMS', 'project · drop cone', 'sRGB simulated'].forEach((t, i) => {
      const cxs = i === 0 || i === 3 ? xs[i] + sw / 2 : xs[i] + bw / 2;
      ctx.fillText(t, cxs, cy + 56);
    });
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const x1 = (i === 0 ? xs[0] + sw : xs[i] + bw) + 4;
      const x2 = xs[i + 1] - 6;
      ctx.beginPath(); ctx.moveTo(x1, cy); ctx.lineTo(x2, cy);
      ctx.moveTo(x2, cy); ctx.lineTo(x2 - 6, cy - 4); ctx.moveTo(x2, cy); ctx.lineTo(x2 - 6, cy + 4); ctx.stroke();
    }
    ctx.textAlign = 'left';

    // Formula + readout.
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(FORMULA[this.type], w / 2, h * 0.8);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`the ${LABELS[di]} cone is missing — rebuilt from the other two`, w / 2, h * 0.8 + 26);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new BrettelPipeline());
