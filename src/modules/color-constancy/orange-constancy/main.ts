import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { D65, A, type WhitePoint } from '@core/math/illuminants';
import { bradfordAdapt, xyzFromLinearSrgb, linearSrgbFromXyz, srgbCss } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type V3 = [number, number, number];
const ORANGE: V3 = [0.82, 0.36, 0.06];
const COOL: WhitePoint = { X: 0.82, Y: 1, Z: 1.30 };
const LIGHTS: Array<[string, WhitePoint]> = [
  ['daylight', D65],
  ['tungsten', A],
  ['cool shade', COOL],
];

class OrangeConstancy {
  private stage: CanvasStage;
  private view = 'perceived';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.view = hydrateFromUrl('view') ?? 'perceived';
    (document.getElementById('view') as EncToggle).value = this.view;
    registerStateParam('view', () => this.view);
    (document.getElementById('view') as EncToggle).addEventListener('change', (e) => {
      this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.view = 'perceived';
      (document.getElementById('view') as EncToggle).value = 'perceived';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(0, 0, w, h);

    const raw = this.view === 'raw';
    const n = LIGHTS.length, pad = 36, gap = 18;
    const pw = (w - pad * 2 - gap * (n - 1)) / n, ph = h * 0.56, py = 70;

    LIGHTS.forEach(([name, W], i) => {
      const x = pad + i * (pw + gap);
      const illumLin = linearSrgbFromXyz([W.X, W.Y, W.Z]);
      const stimLin: V3 = [ORANGE[0] * illumLin[0], ORANGE[1] * illumLin[1], ORANGE[2] * illumLin[2]];

      let bgCss: string, objCss: string;
      if (raw) {
        bgCss = srgbCss([0.42 * illumLin[0], 0.42 * illumLin[1], 0.42 * illumLin[2]]);
        objCss = srgbCss(stimLin);
      } else {
        const adaptObj = bradfordAdapt(xyzFromLinearSrgb(stimLin), W, D65);
        objCss = srgbCss(linearSrgbFromXyz(adaptObj));
        bgCss = srgbCss([0.42, 0.42, 0.42]);
      }
      // Scene panel.
      ctx.fillStyle = bgCss; ctx.fillRect(x, py, pw, ph);
      ctx.strokeStyle = theme.inkAlpha(0.35); ctx.lineWidth = 1; ctx.strokeRect(x, py, pw, ph);
      // Orange.
      ctx.fillStyle = objCss;
      ctx.beginPath(); ctx.arc(x + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.32, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.25); ctx.stroke();
      // Label.
      ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(name, x + pw / 2, py + ph + 20);
    });
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(raw ? 'raw sensor — three different colours leave the fruit' : 'perceiving brain — one orange across all three lights', pad, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new OrangeConstancy());
