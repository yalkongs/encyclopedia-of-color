import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// FOGRA-style press TVI target: peaks ~+14% at 50%
const pressTVI = (t: number) => t + 0.14 * 4 * t * (1 - t);
// proof's native TVI before calibration: a different bump (sharper, peaks higher and earlier)
const proofNative = (t: number) => Math.min(1, t + 0.22 * Math.pow(t, 0.85) * (1 - t) * 1.6);

class ProofVsPress {
  private stage: CanvasStage;
  private cal = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cal = hydrateNumber('cal', 0);
    const s = document.getElementById('cal') as EncSlider;
    s.value = this.cal;
    s.addEventListener('input', (e) => { this.cal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cal', () => Math.round(this.cal));
    document.addEventListener('reset-params', () => { this.cal = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  // proof's measured TVI after calibration: linear blend from native toward press
  private proofMeasured(t: number): number {
    const k = this.cal / 100;
    return proofNative(t) * (1 - k) + pressTVI(t) * k;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // TVI chart
    const gx = 60, gy = 36, gw = w - 110, gh = h - 200;
    const X = (t: number) => gx + t * gw, Y = (v: number) => gy + gh - v * gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { const x = gx + (i / 10) * gw, y = gy + (i / 10) * gh; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    // diagonal reference
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
    // press TVI target (dashed gold)
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]); ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const t = i / 100, v = pressTVI(t); i === 0 ? ctx.moveTo(X(t), Y(v)) : ctx.lineTo(X(t), Y(v)); }
    ctx.stroke(); ctx.setLineDash([]);
    // proof TVI measured (solid crimson)
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const t = i / 100, v = this.proofMeasured(t); i === 0 ? ctx.moveTo(X(t), Y(v)) : ctx.lineTo(X(t), Y(v)); }
    ctx.stroke();
    // legend
    const lx = gx + 14; let ly = gy + 18;
    const key = (col: string, txt: string, dash = false) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; if (dash) ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(lx, ly - 6); ctx.lineTo(lx + 16, ly - 6); ctx.stroke(); ctx.restore(); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(txt, lx + 22, ly - 2); ly += 17; };
    key(theme.gold, 'press TVI target (published)', true);
    key(theme.crimson, `proof TVI at ${Math.round(this.cal)}% calibration`);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('nominal area', gx + gw / 2, gy + gh + 22);
    ctx.save(); ctx.translate(gx - 40, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('measured area (TVI)', 0, 0); ctx.restore();

    // ramp strips below
    const sy = gy + gh + 50, sh = 50, swp = gw / 2;
    for (let i = 0; i < 100; i++) {
      const t = i / 99;
      const vp = pressTVI(t), vm = this.proofMeasured(t);
      const gp = Math.round((1 - vp) * 235 + 15), gm = Math.round((1 - vm) * 235 + 15);
      ctx.fillStyle = `rgb(${gp},${gp},${gp})`; ctx.fillRect(gx + (i / 100) * gw, sy, gw / 100 + 1, sh / 2);
      ctx.fillStyle = `rgb(${gm},${gm},${gm})`; ctx.fillRect(gx + (i / 100) * gw, sy + sh / 2, gw / 100 + 1, sh / 2);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(gx, sy, gw, sh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('press', gx + 6, sy + 14); ctx.fillText('proof', gx + 6, sy + sh / 2 + 14); void swp;

    // mean error
    let err = 0; for (let i = 0; i <= 100; i++) { const t = i / 100; err += Math.abs(this.proofMeasured(t) - pressTVI(t)); } err = (err / 101) * 100;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(err < 0.5
      ? 'proof TVI sits on the press target — contract proof is ready'
      : `mean TVI gap ≈ ${err.toFixed(1)}% — slide the calibration up to pull the proof onto the press curve`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ProofVsPress());
