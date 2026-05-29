import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { yuleNielsenArea, yuleNielsenReflectance } from '@core/math/print';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const G_MECH = 0.08;
const Rp = 1, Rs = Math.pow(10, -1.4); // solid density 1.4
const physArea = (an: number) => Math.min(1, an + G_MECH * 4 * an * (1 - an));

class YuleNielsen {
  private stage: CanvasStage;
  private n = 1.6;
  private ntrue = 2.6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 1.6);
    this.ntrue = hydrateNumber('ntrue', 2.6);
    const sn = document.getElementById('n') as EncSlider;
    sn.value = this.n;
    sn.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => this.n.toFixed(1));
    const st = document.getElementById('ntrue') as EncSlider;
    st.value = this.ntrue;
    st.addEventListener('input', (e) => { this.ntrue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ntrue', () => this.ntrue.toFixed(1));
    document.addEventListener('reset-params', () => { this.n = 1.6; this.ntrue = 2.6; sn.value = 1.6; st.value = 2.6; this.draw(); notifyStateChange(); });
  }

  private Rt(an: number): number { return yuleNielsenReflectance(physArea(an), Rp, Rs, this.ntrue); }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 64, gy = 36, gw = w - 110, gh = h - 100;
    const X = (a: number) => gx + a * gw, Y = (a: number) => gy + gh - a * gh;

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(X(i / 10), gy); ctx.lineTo(X(i / 10), gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx, Y(i / 10)); ctx.lineTo(gx + gw, Y(i / 10)); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);

    const curve = (f: (an: number) => number, col: string, lw: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const an = i / 100, v = Math.max(0, Math.min(1.05, f(an))); i === 0 ? ctx.moveTo(X(an), Y(v)) : ctx.lineTo(X(an), Y(v)); }
      ctx.stroke();
    };
    curve(physArea, theme.slate, 2.6);                                              // truth
    curve((an) => yuleNielsenArea(this.Rt(an), Rp, Rs, 1), theme.inkAlpha(0.5), 1.6); // MD (n=1)
    curve((an) => yuleNielsenArea(this.Rt(an), Rp, Rs, this.n), theme.gold, 2.6);     // YN at slider n

    const lx = gx + 14; let ly = gy + 18;
    const key = (c: string, t: string) => { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly - 6); ctx.lineTo(lx + 16, ly - 6); ctx.stroke(); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(t, lx + 22, ly - 2); ly += 17; };
    key(theme.slate, 'true mechanical area');
    key(theme.inkAlpha(0.5), 'Murray-Davies (n = 1)');
    key(theme.gold, `Yule-Nielsen (n = ${this.n.toFixed(1)})`);

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('nominal area →', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 44, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('recovered dot area', 0, 0); ctx.restore();

    const matched = Math.abs(this.n - this.ntrue) < 0.15;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(matched
      ? `n = ${this.n.toFixed(1)} matches the paper's scatter — Yule-Nielsen sits on the mechanical truth`
      : `n = ${this.n.toFixed(1)} vs true ${this.ntrue.toFixed(1)} — slide n to the paper's scatter to recover the real dot area`, gx + gw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new YuleNielsen());
