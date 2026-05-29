import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { murrayDaviesArea, yuleNielsenReflectance } from '@core/math/print';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const G_MECH = 0.08; // fixed mechanical dot gain
const physArea = (an: number) => Math.min(1, an + G_MECH * 4 * an * (1 - an));

class MurrayDavies {
  private stage: CanvasStage;
  private scatter = 20;
  private dens = 140;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.scatter = hydrateNumber('scatter', 20);
    this.dens = hydrateNumber('dens', 140);
    const ss = document.getElementById('scatter') as EncSlider;
    ss.value = this.scatter;
    ss.addEventListener('input', (e) => { this.scatter = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('scatter', () => Math.round(this.scatter));
    const sd = document.getElementById('dens') as EncSlider;
    sd.value = this.dens;
    sd.addEventListener('input', (e) => { this.dens = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dens', () => Math.round(this.dens));
    document.addEventListener('reset-params', () => { this.scatter = 20; this.dens = 140; ss.value = 20; sd.value = 140; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const nTrue = 1 + this.scatter / 10;       // optical light-scatter → true n
    const Rp = 1, Rs = Math.pow(10, -this.dens / 100);

    const gx = 64, gy = 36, gw = w - 110, gh = h - 100;
    const X = (a: number) => gx + a * gw, Y = (a: number) => gy + gh - a * gh;

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(X(i / 10), gy); ctx.lineTo(X(i / 10), gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx, Y(i / 10)); ctx.lineTo(gx + gw, Y(i / 10)); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);

    const curve = (f: (an: number) => number, col: string) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const an = i / 100, v = f(an); i === 0 ? ctx.moveTo(X(an), Y(v)) : ctx.lineTo(X(an), Y(v)); }
      ctx.stroke();
    };
    const aMD = (an: number) => murrayDaviesArea(yuleNielsenReflectance(physArea(an), Rp, Rs, nTrue), Rp, Rs);
    curve(physArea, theme.slate);     // mechanical truth
    curve(aMD, theme.crimson);        // Murray-Davies measured

    // legend
    const lx = gx + 14; let ly = gy + 18;
    const key = (c: string, t: string) => { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly - 6); ctx.lineTo(lx + 16, ly - 6); ctx.stroke(); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(t, lx + 22, ly - 2); ly += 18; };
    key(theme.slate, 'true mechanical area');
    key(theme.crimson, 'Murray-Davies reads');

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('nominal area →', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 44, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('measured dot area', 0, 0); ctx.restore();

    const am50 = physArea(0.5), md50 = aMD(0.5);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`at 50%: true ${Math.round(am50 * 100)}%, Murray-Davies reads ${Math.round(md50 * 100)}% — ${Math.round((md50 - am50) * 100)}% is optical gain blamed on ink`, gx + gw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MurrayDavies());
