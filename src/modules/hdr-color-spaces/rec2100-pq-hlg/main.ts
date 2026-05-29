import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { pqEncode, hlgEncode } from '@core/math/hdr-spaces';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PqHlg {
  private stage: CanvasStage;
  private light = 100; // per-mille of peak

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.light = hydrateNumber('light', 100);
    const el = document.getElementById('light') as EncSlider;
    el.value = this.light;
    el.addEventListener('input', (e) => { this.light = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('light', () => Math.round(this.light));
    document.addEventListener('reset-params', () => { this.light = 100; el.value = 100; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const x0 = 52, plotY = 28, plotW = w - x0 - 40, plotH = h - 92;
    const mx = (frac: number) => x0 + frac * plotW;
    const my = (code: number) => plotY + plotH - code * plotH;

    // grid
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let g = 0; g <= 1.0001; g += 0.25) {
      ctx.beginPath(); ctx.moveTo(mx(g), plotY); ctx.lineTo(mx(g), plotY + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, my(g)); ctx.lineTo(x0 + plotW, my(g)); ctx.stroke();
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, plotY); ctx.lineTo(x0, plotY + plotH); ctx.lineTo(x0 + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('input light (fraction of peak)', x0 + plotW - 180, plotY + plotH + 16);
    ctx.save(); ctx.translate(x0 - 36, plotY + plotH / 2 + 30); ctx.rotate(-Math.PI / 2); ctx.fillText('signal code', 0, 0); ctx.restore();

    const curve = (fn: (f: number) => number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const f = i / 240; const X = mx(f), Y = my(fn(f)); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke();
    };
    curve((f) => pqEncode(f * 10000, 10000), theme.crimson);
    curve((f) => hlgEncode(f), theme.slate);

    const frac = this.light / 1000;
    const pq = pqEncode(frac * 10000, 10000), hlg = hlgEncode(frac);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(mx(frac), plotY); ctx.lineTo(mx(frac), plotY + plotH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson; ctx.beginPath(); ctx.arc(mx(frac), my(pq), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.slate; ctx.beginPath(); ctx.arc(mx(frac), my(hlg), 5, 0, Math.PI * 2); ctx.fill();

    // legend
    ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = theme.crimson; ctx.fillRect(x0 + 10, plotY + 6, 16, 3); ctx.fillStyle = theme.inkSoft; ctx.fillText('PQ (ST 2084, absolute)', x0 + 32, plotY + 10);
    ctx.fillStyle = theme.slate; ctx.fillRect(x0 + 10, plotY + 24, 16, 3); ctx.fillStyle = theme.inkSoft; ctx.fillText('HLG (relative, SDR-compatible toe)', x0 + 32, plotY + 28);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`at ${(frac * 100).toFixed(1)}% peak (${(frac * 10000).toFixed(0)} cd/m² for PQ):  PQ code ${pq.toFixed(3)} · HLG code ${hlg.toFixed(3)}`, x0, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new PqHlg());
