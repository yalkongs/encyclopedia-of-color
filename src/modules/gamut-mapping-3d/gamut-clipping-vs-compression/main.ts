import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToXyz, labToCss, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz, srgb8 } from '@core/math/color-adaptation';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const DEG = Math.PI / 180;

function inGamut(L: number, a: number, b: number): boolean {
  return srgbInGamut(linearSrgbFromXyz(labToXyz([L, a, b] as Lab)));
}
// Max in-gamut chroma along a hue ray at lightness L.
function boundaryChroma(L: number, hue: number): number {
  const ca = Math.cos(hue * DEG), cb = Math.sin(hue * DEG);
  let lo = 0, hi = 160;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid * ca, mid * cb)) lo = mid; else hi = mid;
  }
  return lo;
}

class ClipCompress {
  private stage: CanvasStage;
  private L = 60; private hue = 320; private C = 120;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 60); this.hue = hydrateNumber('hue', 320); this.C = hydrateNumber('C', 120);
    for (const k of ['L', 'hue', 'C'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.L = 60; this.hue = 320; this.C = 120;
      (document.getElementById('L') as EncSlider).value = 60;
      (document.getElementById('hue') as EncSlider).value = 320;
      (document.getElementById('C') as EncSlider).value = 120;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const Cb = boundaryChroma(this.L, this.hue);
    const Cclip = Math.min(this.C, Cb);
    const knee = 0.85 * Cb;
    const Ccomp = this.C <= knee ? this.C : knee + (Cb - knee) * (1 - Math.exp(-(this.C - knee) / (Cb - knee || 1)));
    const ca = Math.cos(this.hue * DEG), cb = Math.sin(this.hue * DEG);
    const srcLab: Lab = [this.L, this.C * ca, this.C * cb];
    const clipLab: Lab = [this.L, Cclip * ca, Cclip * cb];
    const compLab: Lab = [this.L, Ccomp * ca, Ccomp * cb];

    // a*b* plot
    const M = 150, x0 = 24, plotY = 22;
    const plotH = h - plotY - 80, plotW = Math.min(plotH, w - 320);
    const px = (a: number) => x0 + ((a + M) / (2 * M)) * plotW;
    const py = (b: number) => plotY + (1 - (b + M) / (2 * M)) * plotH;

    // in-gamut region fill (subsample anti-aliased boundary)
    fillRegionAA(ctx, x0, plotY, x0 + plotW, plotY + plotH, (screenX, screenY) => {
      const a = ((screenX - x0) / plotW) * 2 * M - M;
      const b = (1 - (screenY - plotY) / plotH) * 2 * M - M;
      const lin = linearSrgbFromXyz(labToXyz([this.L, a, b] as Lab));
      return srgbInGamut(lin) ? srgb8(lin) : null;
    });
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(-M), py(0)); ctx.lineTo(px(M), py(0)); ctx.moveTo(px(0), py(-M)); ctx.lineTo(px(0), py(M)); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('a*', px(M) - 16, py(0) - 6); ctx.fillText('b*', px(0) + 6, py(M) + 12);

    // hue ray
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(M * ca), py(M * cb)); ctx.stroke(); ctx.setLineDash([]);

    const mark = (lab: Lab, color: string, label: string, r: number) => {
      ctx.beginPath(); ctx.arc(px(lab[1]), py(lab[2]), r, 0, Math.PI * 2);
      ctx.fillStyle = inGamut(lab[0], lab[1], lab[2]) ? labToCss(lab) : theme.inkAlpha(0.15); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = color; ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(label, px(lab[1]) + r + 3, py(lab[2]) - 4);
    };
    mark(srcLab, theme.ink, 'source', 6);
    mark(compLab, theme.slate, 'compress', 6);
    mark(clipLab, theme.crimson, 'clip', 6);

    // patches
    const bx = x0 + plotW + 30, pw = 110, ph = 48;
    const patch = (lab: Lab, y: number, label: string) => {
      ctx.fillStyle = labToCss(lab); ctx.fillRect(bx, y, pw, ph);
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(bx, y, pw, ph);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(label, bx, y + ph + 14);
    };
    patch(clipLab, plotY + 6, `relative clip · C=${Cclip.toFixed(0)}`);
    patch(compLab, plotY + 90, `perceptual compress · C=${Ccomp.toFixed(0)}`);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    const verdict = this.C > Cb ? `source C=${this.C} exceeds boundary C_b=${Cb.toFixed(0)} — both must map inward` : `source C=${this.C} already inside (C_b=${Cb.toFixed(0)})`;
    ctx.fillText(verdict, x0, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new ClipCompress());
