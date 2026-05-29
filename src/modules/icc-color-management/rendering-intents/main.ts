import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToXyz, labToCss, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const DEG = Math.PI / 180;
const L0 = 55, N = 22;

function inG(L: number, a: number, b: number): boolean {
  return srgbInGamut(linearSrgbFromXyz(labToXyz([L, a, b] as Lab)));
}
function boundaryChroma(L: number, hue: number): number {
  const ca = Math.cos(hue * DEG), cb = Math.sin(hue * DEG);
  let lo = 0, hi = 160;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (inG(L, m * ca, m * cb)) lo = m; else hi = m; }
  return lo;
}

const INTENTS: Record<string, { fn: (c: number, Cb: number, Cmax: number) => number; desc: string }> = {
  perceptual: { fn: (c, Cb, Cmax) => c * (Cb / Cmax), desc: 'whole range compressed — gradients stay smooth, in-gamut colours desaturate slightly' },
  relative: { fn: (c, Cb) => Math.min(c, Cb), desc: 'in-gamut untouched, out-of-gamut clipped to the edge — risks posterising the vivid end' },
  absolute: { fn: (c, Cb) => Math.min(c, Cb), desc: 'same clip as relative, but the source white is preserved (no paper-white adaptation)' },
  saturation: { fn: (c, Cb, Cmax) => (c <= 0 ? 0 : Cb * (0.55 + 0.45 * c / Cmax)), desc: 'pushed toward maximum chroma — vividness kept, exact colour sacrificed' },
};

class RenderingIntents {
  private stage: CanvasStage;
  private intent = 'relative'; private hue = 270;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.intent = hydrateFromUrl('intent') ?? 'relative'; this.hue = hydrateNumber('hue', 270);
    const it = document.getElementById('intent') as EncToggle;
    it.value = this.intent;
    it.addEventListener('change', (e) => { this.intent = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('intent', () => this.intent);
    const hs = document.getElementById('hue') as EncSlider;
    hs.value = this.hue;
    hs.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    document.addEventListener('reset-params', () => {
      this.intent = 'relative'; this.hue = 270; it.value = 'relative'; hs.value = 270; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const Cb = boundaryChroma(L0, this.hue);
    const Cmax = Cb * 1.45;
    const ca = Math.cos(this.hue * DEG), cb = Math.sin(this.hue * DEG);
    const intent = INTENTS[this.intent];
    const isAbs = this.intent === 'absolute';

    const x0 = 28, rampW = w - x0 - 28, sw = rampW / N, swH = 40;
    const srcY = 34, outY = srcY + swH + 40;

    ctx.fillStyle = theme.inkMute; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('source chroma ramp', x0, srcY - 8);
    ctx.fillText(`output · ${this.intent}`, x0, outY - 8);

    for (let i = 0; i < N; i++) {
      const C = (i / (N - 1)) * Cmax;
      const sLab: Lab = [L0, C * ca, C * cb];
      const oog = !inG(L0, sLab[1], sLab[2]);
      // source (out-of-gamut steps shown desaturated grey, marked)
      ctx.fillStyle = oog ? theme.inkAlpha(0.12) : labToCss(sLab);
      ctx.fillRect(x0 + i * sw, srcY, sw - 1, swH);
      if (oog) { ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + i * sw, srcY); ctx.lineTo(x0 + i * sw + sw - 1, srcY + swH); ctx.stroke(); }
      // output
      const Co = Math.min(intent.fn(C, Cb, Cmax), Cb);
      const oLab: Lab = [isAbs ? L0 - 1 : L0, Co * ca, Co * cb];
      ctx.fillStyle = labToCss(oLab);
      ctx.fillRect(x0 + i * sw, outY, sw - 1, swH);
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.strokeRect(x0, srcY, rampW, swH); ctx.strokeRect(x0, outY, rampW, swH);

    // mapping curve
    const cy0 = outY + swH + 36, curveH = h - cy0 - 30, curveW = rampW;
    const mx = (c: number) => x0 + (c / Cmax) * curveW;
    const my = (c: number) => cy0 + curveH - (c / Cmax) * curveH;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    ctx.strokeRect(x0, cy0, curveW, curveH);
    // Cb boundary lines
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(mx(Cb), cy0); ctx.lineTo(mx(Cb), cy0 + curveH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, my(Cb)); ctx.lineTo(x0 + curveW, my(Cb)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('C_b', mx(Cb) + 3, cy0 + 12);
    // identity (faint)
    ctx.strokeStyle = theme.inkAlpha(0.15); ctx.beginPath(); ctx.moveTo(mx(0), my(0)); ctx.lineTo(mx(Cmax), my(Cmax)); ctx.stroke();
    // intent curve
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const C = (i / 100) * Cmax;
      const Co = Math.min(intent.fn(C, Cb, Cmax), Cb);
      i === 0 ? ctx.moveTo(mx(C), my(Co)) : ctx.lineTo(mx(C), my(Co));
    }
    ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('source C →', x0 + curveW - 64, cy0 + curveH + 14);
    ctx.save(); ctx.translate(x0 - 8, cy0 + 40); ctx.rotate(-Math.PI / 2); ctx.fillText('output C', 0, 0); ctx.restore();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(intent.desc, x0, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new RenderingIntents());
