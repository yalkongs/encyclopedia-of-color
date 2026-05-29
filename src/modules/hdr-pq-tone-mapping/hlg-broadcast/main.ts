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
import { hlgDecode, pqDecode } from '@core/math/hdr-spaces';

const LO = 0.005, HI = 10000;

class HLG {
  private stage: CanvasStage;
  private lw = 1000;
  private pq = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lw = hydrateNumber('lw', 1000);
    this.pq = hydrateFromUrl('pq') ?? 'off';
    const s = document.getElementById('lw') as EncSlider;
    s.value = this.lw;
    s.addEventListener('input', (e) => { this.lw = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lw', () => Math.round(this.lw));
    const t = document.getElementById('pq') as EncToggle;
    t.value = this.pq;
    t.addEventListener('change', (e) => { this.pq = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pq', () => this.pq);
    document.addEventListener('reset-params', () => { this.lw = 1000; this.pq = 'off'; s.value = 1000; t.value = 'off'; this.draw(); notifyStateChange(); });
  }

  private gammaS(): number { return 1.2 + 0.42 * Math.log10(this.lw / 1000); }
  private yMap(L: number, gy: number, gh: number): number {
    const v = (Math.log10(Math.max(LO, L)) - Math.log10(LO)) / (Math.log10(HI) - Math.log10(LO));
    return gy + gh - Math.max(0, Math.min(1, v)) * gh;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 74, gy = 34, gw = w - 120, gh = h - 96;
    const gs = this.gammaS();

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1; ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
    for (const dec of [0.01, 0.1, 1, 10, 100, 1000, 10000]) { const y = this.yMap(dec, gy, gh); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); ctx.fillText(`${dec}`, gx - 8, y + 3); }
    for (let i = 0; i <= 10; i++) { const x = gx + (i / 10) * gw; ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    const plot = (f: (V: number) => number, stroke: string, lw: number, dash: number[] = []) => {
      ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
      for (let i = 0; i <= 256; i++) { const V = i / 256, L = f(V); const x = gx + V * gw, y = this.yMap(L, gy, gh); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    };
    // ghost HLG curves for 1000 and 4000 to show the family
    plot((V) => 1000 * Math.pow(hlgDecode(V), 1.2), theme.inkAlpha(0.16), 1);
    plot((V) => 4000 * Math.pow(hlgDecode(V), 1.2 + 0.42 * Math.log10(4)), theme.inkAlpha(0.16), 1);
    if (this.pq === 'on') plot((V) => pqDecode(V), theme.slate, 1.6, [5, 4]);
    plot((V) => this.lw * Math.pow(hlgDecode(V), gs), theme.crimson, 2.6);  // selected HLG

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HLG signal V', gx + gw / 2, gy + gh + 28);
    ctx.save(); ctx.translate(gx - 52, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('display luminance (cd/m², log)', 0, 0); ctx.restore();
    const lx = gx + 14; let ly = gy + 16;
    const key = (col: string, txt: string, dash = false) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; if (dash) ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(lx, ly - 7); ctx.lineTo(lx + 16, ly - 7); ctx.stroke(); ctx.restore(); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(txt, lx + 22, ly - 2); ly += 18; };
    key(theme.crimson, `HLG · L_W ${Math.round(this.lw)} nits · γ_s ${gs.toFixed(3)}`);
    if (this.pq === 'on') key(theme.slate, 'PQ ST 2084 (absolute)', true);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`raising L_W lifts the ceiling and steepens γ_s — the same signal, reshaped for the panel`, gx + gw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new HLG());
