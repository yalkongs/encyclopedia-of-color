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

// approximate Lab a*,b* for ISO 12647 reference solids on coated stock (FOGRA51-ish)
const REFS: { name: string; a: number; b: number; col: string }[] = [
  { name: 'C', a: -36, b: -50, col: '#00aeef' },
  { name: 'M', a:  75, b: -5,  col: '#ec008c' },
  { name: 'Y', a:  -5, b:  95, col: '#fff200' },
  { name: 'K', a:   0, b:  0,  col: '#231f20' },
  { name: 'R', a:  60, b:  50, col: '#e2392f' },
  { name: 'G', a: -64, b:  45, col: '#2d9c4d' },
  { name: 'B', a:  18, b: -55, col: '#3a3bc1' },
  { name: 'paper', a:  0, b:  -2, col: '#f6f3eb' },
];
// ISO 12647-2 sheet-fed coated tolerances vs 12647-3 newsprint (looser)
const TOL: Record<string, number> = { '2': 5, '3': 8 };
function hash(i: number): number { const s = Math.sin(i * 91.31 + 7.7) * 9999; return s - Math.floor(s); }

class FograIso {
  private stage: CanvasStage;
  private vari = 35;
  private std = '2';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.vari = hydrateNumber('var', 35);
    this.std = hydrateFromUrl('std') ?? '2';
    const s = document.getElementById('var') as EncSlider;
    s.value = this.vari;
    s.addEventListener('input', (e) => { this.vari = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('var', () => Math.round(this.vari));
    const t = document.getElementById('std') as EncToggle;
    t.value = this.std;
    t.addEventListener('change', (e) => { this.std = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('std', () => this.std);
    document.addEventListener('reset-params', () => { this.vari = 35; this.std = '2'; s.value = 35; t.value = '2'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const tol = TOL[this.std];
    const noise = (this.vari / 100) * 10; // 0..10 ΔE radius

    // a*b* chart on the left
    const gx = 60, gy = 30, gw = Math.min(w * 0.6, h * 0.95), gh = h - 96;
    const Ax = (a: number) => gx + ((a + 90) / 180) * gw;
    const Bx = (b: number) => gy + gh - ((b + 100) / 200) * gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let a = -90; a <= 90; a += 30) { ctx.beginPath(); ctx.moveTo(Ax(a), gy); ctx.lineTo(Ax(a), gy + gh); ctx.stroke(); }
    for (let b = -100; b <= 100; b += 25) { ctx.beginPath(); ctx.moveTo(gx, Bx(b)); ctx.lineTo(gx + gw, Bx(b)); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    // origin axes
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.beginPath(); ctx.moveTo(Ax(0), gy); ctx.lineTo(Ax(0), gy + gh); ctx.moveTo(gx, Bx(0)); ctx.lineTo(gx + gw, Bx(0)); ctx.stroke();

    // pixel scale ≈ gw/180 per ΔE unit horizontally
    const pxPerDE = gw / 180;
    let pass = 0;
    REFS.forEach((r, i) => {
      // tolerance ring
      ctx.strokeStyle = theme.inkAlpha(0.45); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(Ax(r.a), Bx(r.b), tol * pxPerDE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // reference dot
      ctx.fillStyle = r.col; ctx.beginPath(); ctx.arc(Ax(r.a), Bx(r.b), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 1; ctx.stroke();
      // measured patch — deterministic offset
      const ang = hash(i * 3.7) * Math.PI * 2, mag = (0.3 + 0.7 * hash(i * 5.1)) * noise;
      const da = Math.cos(ang) * mag, db = Math.sin(ang) * mag, dist = Math.hypot(da, db);
      const inTol = dist <= tol;
      if (inTol) pass++;
      ctx.fillStyle = inTol ? '#2e7d4f' : '#9b2828';
      ctx.beginPath(); ctx.arc(Ax(r.a + da), Bx(r.b + db), 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = theme.ink; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(r.name, Ax(r.a), Bx(r.b) - 10);
    });
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('a*', gx + gw / 2, gy + gh + 22); ctx.save(); ctx.translate(gx - 24, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('b*', 0, 0); ctx.restore();

    // legend on the right
    const lx = gx + gw + 40, ly0 = gy + 30;
    ctx.fillStyle = theme.ink; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Tolerance: ΔE ≤ ${tol}`, lx, ly0);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Standard: ${this.std === '2' ? 'ISO 12647-2 sheet-fed (coated)' : 'ISO 12647-3 newsprint'}`, lx, ly0 + 24);
    ctx.fillText(`Press variability: ${Math.round(this.vari)}% (noise ≈ ΔE ${noise.toFixed(1)})`, lx, ly0 + 44);
    ctx.fillStyle = pass === REFS.length ? '#2e7d4f' : '#9b2828'; ctx.font = '700 18px Inter, sans-serif';
    ctx.fillText(`${pass} / ${REFS.length} patches in tolerance`, lx, ly0 + 80);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(pass === REFS.length
      ? 'every reference patch sits inside its ring — the run conforms'
      : `${REFS.length - pass} patch${REFS.length - pass > 1 ? 'es' : ''} broke tolerance — the run fails this standard`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new FograIso());
