import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class LensDistortion {
  private stage: CanvasStage;
  private dist = 12;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dist = hydrateNumber('dist', 12);
    const s = document.getElementById('dist') as EncSlider;
    s.value = this.dist;
    s.addEventListener('input', (e) => { this.dist = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dist', () => Math.round(this.dist));
    document.addEventListener('reset-params', () => { this.dist = 12; s.value = 12; this.draw(); notifyStateChange(); });
  }

  // map a normalised (u,v) ∈ [-1,1] to distorted (u',v') by radial coefficient k1
  private warp(u: number, v: number, k1: number): [number, number] {
    const r2 = u * u + v * v;
    const f = 1 + k1 * r2;
    return [u * f, v * f];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const k1 = this.dist / 100;

    // LEFT: warped grid
    const gx = 40, gy = 50, gw = Math.min(w * 0.46, h * 0.85), gh = gw;
    ctx.strokeStyle = '#1a1714'; ctx.lineWidth = 1.2;
    const N = 14;
    const toScreen = (u: number, v: number) => [gx + (u + 1) * 0.5 * gw, gy + (v + 1) * 0.5 * gh];
    for (let r = 0; r <= N; r++) {
      ctx.beginPath();
      for (let c = 0; c <= N; c++) {
        const u = (c / N) * 2 - 1, v = (r / N) * 2 - 1;
        const [uu, vv] = this.warp(u, v, k1);
        const [sx, sy] = toScreen(uu, vv);
        c === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    for (let c = 0; c <= N; c++) {
      ctx.beginPath();
      for (let r = 0; r <= N; r++) {
        const u = (c / N) * 2 - 1, v = (r / N) * 2 - 1;
        const [uu, vv] = this.warp(u, v, k1);
        const [sx, sy] = toScreen(uu, vv);
        r === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(k1 > 0.02 ? 'barrel distortion' : k1 < -0.02 ? 'pincushion distortion' : 'rectilinear (no distortion)', gx + gw / 2, gy - 12);

    // RIGHT: MTF chart
    const cx = gx + gw + 50, cy = gy, cw = w - cx - 30, ch = gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { const x = cx + (i / 10) * cw, y = cy + (i / 10) * ch; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy + ch); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + cw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(cx, cy, cw, ch);
    // centre MTF: falls slowly. Edge MTF: falls faster, more so with distortion.
    const distAbs = Math.abs(k1);
    const fall = (nu: number, edge: boolean) => {
      const a = edge ? 1.4 + 4 * distAbs : 0.9;
      return Math.exp(-Math.pow(nu * a, 1.4));
    };
    const Xn = (n: number) => cx + n * cw, Y = (m: number) => cy + ch - m * ch;
    const curve = (edge: boolean, col: string) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const nu = i / 100, m = fall(nu, edge); const x = Xn(nu), y = Y(m); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    };
    curve(false, theme.gold); curve(true, theme.crimson);
    // legend
    const lx = cx + 14; let ly = cy + 18;
    const key = (col: string, t: string) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly - 6); ctx.lineTo(lx + 16, ly - 6); ctx.stroke(); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(t, lx + 22, ly - 2); ly += 17; };
    key(theme.gold, 'centre MTF'); key(theme.crimson, 'edge MTF');
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('spatial frequency →', cx + cw / 2, cy + ch + 22);
    ctx.save(); ctx.translate(cx - 14, cy + ch / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('contrast', 0, 0); ctx.restore();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`distortion ${this.dist}% — edge MTF falls off ${distAbs > 0.15 ? 'sharply' : distAbs > 0.05 ? 'noticeably' : 'gently'} relative to the centre`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new LensDistortion());
