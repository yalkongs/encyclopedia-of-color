import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { oklchToOklab, oklabToLinSrgb } from '@core/math/oklab';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const LIGHT = [0.965, 0.93, 0.86, 0.78, 0.68, 0.58, 0.49, 0.40, 0.32, 0.25]; // OKLCH L per step
const enc = (c: number) => { const x = Math.max(0, Math.min(1, c)); const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return Math.round(v * 255); };
const toHex = (lin: [number, number, number]) => '#' + lin.map((c) => enc(c).toString(16).padStart(2, '0')).join('');

class CodeExporter {
  private stage: CanvasStage;
  private hue = 265; private C = 16; private fmt = 'tw';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 265); this.C = hydrateNumber('C', 16); this.fmt = hydrateFromUrl('fmt') ?? 'tw';
    for (const k of ['hue', 'C'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const t = document.getElementById('fmt') as EncToggle;
    t.value = this.fmt;
    t.addEventListener('change', (e) => { this.fmt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('fmt', () => this.fmt);
    document.addEventListener('reset-params', () => {
      this.hue = 265; this.C = 16; this.fmt = 'tw';
      (document.getElementById('hue') as EncSlider).value = 265; (document.getElementById('C') as EncSlider).value = 16; t.value = 'tw'; this.draw(); notifyStateChange();
    });
  }

  private ramp(): string[] {
    return STEPS.map((_, i) => {
      const cScale = 1 - Math.abs(i - 4.5) / 6; // taper chroma at the extremes
      return toHex(oklabToLinSrgb(oklchToOklab([LIGHT[i], (this.C / 100) * cScale, this.hue])));
    });
  }

  private code(hex: string[]): string[] {
    if (this.fmt === 'tw') return ['colors: {', '  brand: {', ...STEPS.map((s, i) => `    ${s}: '${hex[i]}',`), '  },', '}'];
    if (this.fmt === 'css') return [':root {', ...STEPS.map((s, i) => `  --brand-${s}: ${hex[i]};`), '}'];
    return ['{', '  "brand": {', ...STEPS.map((s, i) => `    "${s}": "${hex[i]}"${i < STEPS.length - 1 ? ',' : ''}`), '  }', '}'];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const hex = this.ramp();

    // swatch ramp
    const x0 = 24, y0 = 28, sw = (w - 48) / STEPS.length, sh = 60;
    hex.forEach((hx, i) => {
      ctx.fillStyle = hx; ctx.fillRect(x0 + i * sw, y0, sw - 2, sh);
      ctx.fillStyle = i < 4 ? theme.inkSoft : 'rgba(255,255,255,0.9)'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(STEPS[i]), x0 + i * sw + sw / 2, y0 + sh - 6);
    });
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, sw * STEPS.length - 2, sh);

    // code panel
    const cy = y0 + sh + 24, lines = this.code(hex);
    ctx.fillStyle = theme.ink; ctx.fillRect(x0, cy, w - 48, h - cy - 24);
    ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left';
    lines.forEach((ln, i) => {
      ctx.fillStyle = 'rgba(250,246,232,0.92)'; ctx.fillText(ln, x0 + 16, cy + 22 + i * 17);
      // colour chip beside value lines
      const m = ln.match(/#[0-9a-f]{6}/i);
      if (m) { ctx.fillStyle = m[0]; ctx.fillRect(x0 + 16 + ctx.measureText(ln).width + 8, cy + 12 + i * 17, 11, 11); }
    });
  }
}
window.addEventListener('DOMContentLoaded', () => new CodeExporter());
