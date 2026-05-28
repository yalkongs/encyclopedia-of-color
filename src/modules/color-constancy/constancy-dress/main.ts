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
// The dress's ambiguous stripe pixels, in linear-sRGB.
const STRIPE_LIGHT: V3 = [0.36, 0.40, 0.55];
const STRIPE_DARK: V3 = [0.17, 0.12, 0.06];
const COOL: WhitePoint = { X: 0.82, Y: 1, Z: 1.30 };

class Dress {
  private stage: CanvasStage;
  private assume = 'cool';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.assume = hydrateFromUrl('assume') ?? 'cool';
    (document.getElementById('assume') as EncToggle).value = this.assume;
    registerStateParam('assume', () => this.assume);
    (document.getElementById('assume') as EncToggle).addEventListener('change', (e) => {
      this.assume = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.assume = 'cool';
      (document.getElementById('assume') as EncToggle).value = 'cool';
      this.draw(); notifyStateChange();
    });
  }

  private inferred(lin: V3): string {
    const W = this.assume === 'cool' ? COOL : A;
    const adj = bradfordAdapt(xyzFromLinearSrgb(lin), W, D65);
    return srgbCss(linearSrgbFromXyz(adj));
  }

  private drawDress(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: string, dark: string) {
    const stripes = 9;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? light : dark;
      ctx.fillRect(x, y + (i / stripes) * h, w, h / stripes + 1);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const dw = w * 0.26, dh = h * 0.56, dy = 64;
    // Actual fixed pixels (centre).
    const cx = w * 0.5 - dw / 2;
    this.drawDress(ctx, cx, dy, dw, dh, srgbCss(STRIPE_LIGHT), srgbCss(STRIPE_DARK));
    // Inferred interpretation (right).
    const ix = w * 0.72 - dw / 2;
    this.drawDress(ctx, ix, dy, dw, dh, this.inferred(STRIPE_LIGHT), this.inferred(STRIPE_DARK));

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('the actual pixels (fixed)', cx + dw / 2, dy - 12);
    ctx.fillText('what your brain reads', ix + dw / 2, dy - 12);
    ctx.textAlign = 'left';

    const verdict = this.assume === 'cool' ? 'assuming cool light → white & gold' : 'assuming warm light → blue & black';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(verdict, w * 0.12, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Dress());
