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
import { melanopsin } from '@core/math/cone-fundamentals';

const LMIN = 400, LMAX = 700;
const gauss = (l: number, mu: number, sd: number) => Math.exp(-0.5 * ((l - mu) / sd) ** 2);

// idealised three-primary display SPD (relative)
function spd(l: number): number {
  return 1.0 * gauss(l, 459, 11) + 0.95 * gauss(l, 535, 28) + 0.9 * gauss(l, 612, 16);
}
// blue-light filter transmission at strength s (0..1): cuts a 430-490 band
function transmission(l: number, s: number): number {
  const cut = gauss(l, 455, 26); // peaks in the blue band
  return 1 - s * cut;
}

class FilterSPD {
  private stage: CanvasStage;
  private strength = 0;
  private showmel = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.strength = hydrateNumber('strength', 0);
    this.showmel = hydrateFromUrl('showmel') ?? 'on';
    const s = document.getElementById('strength') as EncSlider;
    s.value = this.strength;
    s.addEventListener('input', (e) => { this.strength = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('strength', () => Math.round(this.strength));
    const t = document.getElementById('showmel') as EncToggle;
    t.value = this.showmel;
    t.addEventListener('change', (e) => { this.showmel = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('showmel', () => this.showmel);
    document.addEventListener('reset-params', () => { this.strength = 0; this.showmel = 'on'; s.value = 0; t.value = 'on'; this.draw(); notifyStateChange(); });
  }

  private metrics(s: number) {
    let mel0 = 0, melF = 0, lum0 = 0, lumF = 0;
    for (let l = LMIN; l <= LMAX; l += 1) {
      const e = spd(l), f = e * transmission(l, s), m = melanopsin(l);
      mel0 += e * m; melF += f * m; lum0 += e; lumF += f;
    }
    return { melCut: 1 - melF / mel0, lumCut: 1 - lumF / lum0 };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 56, gy = 32, gw = w - 100, gh = h - 96;
    const s = this.strength / 100;
    const X = (l: number) => gx + ((l - LMIN) / (LMAX - LMIN)) * gw;
    const Y = (v: number) => gy + gh - v * gh; // v in 0..1.1

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 400; l <= 700; l += 50) { ctx.beginPath(); ctx.moveTo(X(l), gy); ctx.lineTo(X(l), gy + gh); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    // original SPD (faint) and filtered SPD (filled)
    const drawCurve = (f: (l: number) => number, stroke: string, fill: string | null, lw: number, dash: number[] = []) => {
      ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.setLineDash(dash);
      ctx.beginPath();
      for (let l = LMIN; l <= LMAX; l += 1) { const x = X(l), y = Y(f(l) / 1.05); l === LMIN ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      if (fill) { ctx.lineTo(X(LMAX), Y(0)); ctx.lineTo(X(LMIN), Y(0)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke(); ctx.restore();
    };
    drawCurve((l) => spd(l), theme.inkAlpha(0.3), null, 1.4, [5, 4]);
    drawCurve((l) => spd(l) * transmission(l, s), theme.crimson, 'rgba(155,40,40,0.14)', 2);

    if (this.showmel === 'on') drawCurve((l) => melanopsin(l), theme.slate, null, 1.8);

    // labels
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 700; l += 50) ctx.fillText(`${l}`, X(l), gy + gh + 16);
    ctx.fillText('wavelength (nm)', gx + gw / 2, gy + gh + 32);

    const lx = gx + gw - 200; let ly = gy + 16;
    const key = (col: string, txt: string, dash = false) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; if (dash) ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(lx, ly - 7); ctx.lineTo(lx + 16, ly - 7); ctx.stroke(); ctx.restore(); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(txt, lx + 22, ly - 2); ly += 17; };
    key(theme.inkAlpha(0.45), 'display SPD (no filter)', true);
    key(theme.crimson, 'filtered SPD');
    if (this.showmel === 'on') key(theme.slate, 'melanopsin sensitivity');

    const { melCut, lumCut } = this.metrics(s);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`filter ${Math.round(this.strength)}% → melanopic stimulus −${(melCut * 100).toFixed(0)}%, total light only −${(lumCut * 100).toFixed(0)}%`, gx + gw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new FilterSPD());
