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

const PAIRS: Record<string, { a: string; b: string; aw: number; bw: number; an: string; bn: string }> = {
  yv: { a: 'hsl(52,90%,55%)', b: 'hsl(280,45%,40%)', aw: 9, bw: 3, an: 'yellow', bn: 'violet' },
  ob: { a: 'hsl(30,85%,52%)', b: 'hsl(212,70%,45%)', aw: 8, bw: 4, an: 'orange', bn: 'blue' },
  rg: { a: 'hsl(2,72%,50%)', b: 'hsl(135,55%,42%)', aw: 6, bw: 6, an: 'red', bn: 'green' },
};

class AreaEquilibrium {
  private stage: CanvasStage;
  private split = 25; private pair = 'yv';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.split = hydrateNumber('split', 25); this.pair = hydrateFromUrl('pair') ?? 'yv';
    const s = document.getElementById('split') as EncSlider;
    s.value = this.split;
    s.addEventListener('input', (e) => { this.split = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('split', () => Math.round(this.split));
    const t = document.getElementById('pair') as EncToggle;
    t.value = this.pair;
    t.addEventListener('change', (e) => { this.pair = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pair', () => this.pair);
    document.addEventListener('reset-params', () => {
      this.split = 25; this.pair = 'yv'; s.value = 25; t.value = 'yv'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const p = PAIRS[this.pair];
    const balanced = (p.bw / (p.aw + p.bw)) * 100; // area% of A at balance = w_B/(w_A+w_B)

    const x0 = 40, y0 = 50, cw = w - 80, ch = h - 150;
    const aw = (this.split / 100) * cw;
    ctx.fillStyle = p.a; ctx.fillRect(x0, y0, aw, ch);
    ctx.fillStyle = p.b; ctx.fillRect(x0 + aw, y0, cw - aw, ch);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    if (aw > 40) ctx.fillText(`${p.an} ${Math.round(this.split)}%`, x0 + aw / 2, y0 + ch - 12);
    if (cw - aw > 40) ctx.fillText(`${p.bn} ${Math.round(100 - this.split)}%`, x0 + aw + (cw - aw) / 2, y0 + ch - 12);

    // balanced tick
    const bx = x0 + (balanced / 100) * cw;
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(bx, y0 - 10); ctx.lineTo(bx, y0 + ch + 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`balanced ${balanced.toFixed(0)}:${(100 - balanced).toFixed(0)}`, bx, y0 - 16);

    const off = Math.abs(this.split - balanced);
    ctx.fillStyle = off < 3 ? theme.slate : theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(off < 3
      ? `balanced — areas inverse to weights (${p.an} ${p.aw} : ${p.bn} ${p.bw})`
      : `weights ${p.an} ${p.aw} : ${p.bn} ${p.bw} — slide to the gold tick to balance`, w / 2, h - 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new AreaEquilibrium());
