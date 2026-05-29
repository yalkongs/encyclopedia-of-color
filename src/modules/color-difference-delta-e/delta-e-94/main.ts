import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToCss, deltaE76, deltaE94 } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const HUE = 50 * Math.PI / 180; // fixed reference hue
const REF_L = 55;

class DeltaE94Mod {
  private stage: CanvasStage;
  private c1 = 20; private off = 8; private mode = 'graphic';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c1 = hydrateNumber('c1', 20); this.off = hydrateNumber('off', 8); this.mode = hydrateFromUrl('mode') ?? 'graphic';
    for (const k of ['c1', 'off'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const mt = document.getElementById('mode') as EncToggle;
    mt.value = this.mode;
    mt.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => {
      this.c1 = 20; this.off = 8; this.mode = 'graphic';
      (document.getElementById('c1') as EncSlider).value = 20;
      (document.getElementById('off') as EncSlider).value = 8;
      mt.value = 'graphic'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const textiles = this.mode === 'textiles';
    const K1 = textiles ? 0.048 : 0.045, K2 = textiles ? 0.014 : 0.015, kL = textiles ? 2 : 1;

    const ref: Lab = [REF_L, this.c1 * Math.cos(HUE), this.c1 * Math.sin(HUE)];
    // fixed shift: along chroma direction + perpendicular + a little lightness
    const ux = Math.cos(HUE), uy = Math.sin(HUE);
    const sample: Lab = [
      REF_L + this.off * 0.4,
      ref[1] + this.off * (0.7 * ux - 0.7 * uy),
      ref[2] + this.off * (0.7 * uy + 0.7 * ux),
    ];
    const dE76 = deltaE76(ref, sample);
    const dE94 = deltaE94(ref, sample, textiles);
    const SC = 1 + K1 * this.c1, SH = 1 + K2 * this.c1;

    // patches
    const pw = 76, ph = 54, py = 24;
    ctx.fillStyle = labToCss(ref); ctx.fillRect(24, py, pw, ph);
    ctx.fillStyle = labToCss(sample); ctx.fillRect(24 + pw + 12, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.strokeRect(24, py, pw, ph); ctx.strokeRect(24 + pw + 12, py, pw, ph);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`reference  C₁=${this.c1}`, 24, py + ph + 14); ctx.fillText('sample', 24 + pw + 12, py + ph + 14);

    const rx = 24 + 2 * pw + 34;
    ctx.fillStyle = theme.inkMute; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`ΔE₇₆ = ${dE76.toFixed(2)}  (unweighted)`, rx, py + 18);
    ctx.fillStyle = theme.crimson; ctx.font = '700 28px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ΔE₉₄ = ${dE94.toFixed(2)}`, rx, py + 46);

    // SC / SH meters
    const by = py + ph + 38;
    const barX = 150, barMax = w - barX - 80, rowH = Math.min(44, (h - by - 28) / 3);
    const meter = (i: number, label: string, val: number, max: number) => {
      const y = by + i * rowH;
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, 24, y + rowH * 0.5 + 4);
      ctx.fillStyle = theme.goldAlpha(0.25); ctx.fillRect(barX, y + 6, barMax, rowH - 18);
      ctx.fillStyle = theme.slate; ctx.fillRect(barX, y + 6, (val / max) * barMax, rowH - 18);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(val.toFixed(2), barX + (val / max) * barMax + 6, y + rowH * 0.5 + 4);
    };
    const SCmax = 1 + K1 * 90, SHmax = 1 + K2 * 90;
    meter(0, `S_C = 1 + ${K1}·C₁`, SC, SCmax);
    meter(1, `S_H = 1 + ${K2}·C₁`, SH, SHmax);
    meter(2, `k_L (lightness)`, kL, 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`raise C₁: SC, SH grow, so the same shift yields a smaller ΔE94 — vivid colours tolerate more`, 24, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new DeltaE94Mod());
