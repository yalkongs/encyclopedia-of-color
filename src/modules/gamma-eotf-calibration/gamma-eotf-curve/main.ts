import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const srgbEotf = (V: number) => (V <= 0.04045 ? V / 12.92 : Math.pow((V + 0.055) / 1.055, 2.4));

class GammaCurve {
  private stage: CanvasStage;
  private gamma = 2.2;
  private scale = 'linear';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.gamma = hydrateNumber('gamma', 2.2);
    this.scale = hydrateFromUrl('scale') ?? 'linear';
    const s = document.getElementById('gamma') as EncSlider;
    s.value = this.gamma;
    s.addEventListener('input', (e) => { this.gamma = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('gamma', () => this.gamma.toFixed(2));
    const t = document.getElementById('scale') as EncToggle;
    t.value = this.scale;
    t.addEventListener('change', (e) => { this.scale = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('scale', () => this.scale);
    document.addEventListener('reset-params', () => {
      this.gamma = 2.2; this.scale = 'linear'; s.value = 2.2; t.value = 'linear'; this.draw(); notifyStateChange();
    });
  }

  // map luminance 0..1 to plot height, honouring the chosen axis scale
  private yMap(L: number, gy: number, gh: number): number {
    if (this.scale === 'log') {
      const lo = 1e-4;
      const v = Math.log10(Math.max(lo, L) / lo) / Math.log10(1 / lo); // 0..1
      return gy + gh - v * gh;
    }
    return gy + gh - L * gh;
  }

  private plot(ctx: CanvasRenderingContext2D, f: (V: number) => number, gx: number, gy: number, gw: number, gh: number, stroke: string, lw: number, dash: number[] = []) {
    ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
    for (let i = 0; i <= 256; i++) {
      const V = i / 256, L = f(V);
      const x = gx + V * gw, y = this.yMap(L, gy, gh);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 64, gy = 36, gw = w - 110, gh = h - 96;

    // grid + axes
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = gx + (i / 10) * gw;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke();
    }
    if (this.scale === 'linear') {
      for (let i = 0; i <= 10; i++) { const y = gy + (i / 10) * gh; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    } else {
      for (const dec of [0, 1, 2, 3, 4]) { const y = this.yMap(Math.pow(10, -dec), gy, gh); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    // linear reference (faint)
    this.plot(ctx, (V) => V, gx, gy, gw, gh, theme.inkAlpha(0.25), 1, [4, 4]);
    // sRGB reference
    this.plot(ctx, srgbEotf, gx, gy, gw, gh, theme.gold, 2.4);
    // adjustable power law
    this.plot(ctx, (V) => Math.pow(V, this.gamma), gx, gy, gw, gh, theme.crimson, 2.4);

    // labels
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('code value V', gx + gw / 2, gy + gh + 30);
    ctx.save(); ctx.translate(gx - 44, gy + gh / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(this.scale === 'log' ? 'luminance L (log)' : 'luminance L', 0, 0); ctx.restore();

    // legend
    const lx = gx + 14; let ly = gy + 16;
    const key = (col: string, txt: string) => { ctx.fillStyle = col; ctx.fillRect(lx, ly - 8, 16, 3); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(txt, lx + 22, ly - 2); ly += 18; };
    key(theme.gold, 'sRGB EOTF (linear toe + 2.4)');
    key(theme.crimson, `power law  γ = ${this.gamma.toFixed(2)}`);

    // shadow-deviation readout at V = 0.05
    const Vp = 0.05;
    const dev = (Math.pow(Vp, this.gamma) - srgbEotf(Vp));
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`at V=0.05 the power law sits ${dev >= 0 ? 'above' : 'below'} sRGB by ${Math.abs(dev * 100).toFixed(2)}% luminance — the shadow gap`, gx + gw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new GammaCurve());
