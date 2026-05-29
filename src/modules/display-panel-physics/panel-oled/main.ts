import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { spectralToXYZ, xyzToSrgb, rgbToCssRgb, type SpectrumFn } from '@core/math/spectral';
import { xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const g = (l: number, mu: number, sd: number) => Math.exp(-0.5 * ((l - mu) / sd) ** 2);
const K = 1 / spectralToXYZ(() => 1).Y;

class PanelOled {
  private stage: CanvasStage;
  private blue = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.blue = hydrateNumber('blue', 100);
    const s = document.getElementById('blue') as EncSlider;
    s.value = this.blue;
    s.addEventListener('input', (e) => { this.blue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('blue', () => Math.round(this.blue));
    document.addEventListener('reset-params', () => { this.blue = 100; s.value = 100; this.draw(); notifyStateChange(); });
  }

  private comps(l: number) {
    return { R: 0.95 * g(l, 615, 26), G: 1.0 * g(l, 530, 34), B: (this.blue / 100) * g(l, 460, 22) };
  }
  private sum: SpectrumFn = (l) => { const c = this.comps(l); return c.R + c.G + c.B; };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0c0c12'; ctx.fillRect(0, 0, w, h);
    const x0 = 50, y0 = 30, pw = w * 0.66, ph = h - 80;
    const lx = (l: number) => x0 + ((l - 400) / 300) * pw;
    let maxV = 0; for (let l = 400; l <= 700; l += 5) maxV = Math.max(maxV, this.sum(l));
    const py = (v: number) => y0 + ph - (v / (maxV * 1.1)) * ph;
    ctx.strokeStyle = 'rgba(200,200,210,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + ph); ctx.lineTo(x0 + pw, y0 + ph); ctx.stroke();
    ctx.fillStyle = 'rgba(200,200,210,0.6)'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) ctx.fillText(String(l), lx(l), y0 + ph + 14);

    const curve = (sel: 'R' | 'G' | 'B', col: string) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let l = 400; l <= 700; l += 2) { const Y = py(this.comps(l)[sel]); l === 400 ? ctx.moveTo(lx(l), Y) : ctx.lineTo(lx(l), Y); } ctx.stroke();
    };
    curve('R', '#e25555'); curve('G', '#5fbf6f'); curve('B', '#5a86e0');
    ctx.strokeStyle = '#f0eee8'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let l = 400; l <= 700; l += 2) { const Y = py(this.sum(l)); l === 400 ? ctx.moveTo(lx(l), Y) : ctx.lineTo(lx(l), Y); } ctx.stroke();

    // resulting white
    const xyz = spectralToXYZ(this.sum); const css = rgbToCssRgb(xyzToSrgb({ X: xyz.X * K, Y: xyz.Y * K, Z: xyz.Z * K }));
    const s = xyz.X + xyz.Y + xyz.Z; const wx = xyz.X / s, wy = xyz.Y / s;
    const bx = x0 + pw + 26;
    ctx.fillStyle = css; ctx.fillRect(bx, y0 + 10, w - bx - 30, 90); ctx.strokeStyle = 'rgba(200,200,210,0.4)'; ctx.strokeRect(bx, y0 + 10, w - bx - 30, 90);
    ctx.fillStyle = 'rgba(200,200,210,0.8)'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('emitted white', bx, y0 + 116); ctx.fillText(`x ${wx.toFixed(3)} y ${wy.toFixed(3)}`, bx, y0 + 134);
    void xyToCss;

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('three broad organic bands sum to white — per-pixel emission gives true blacks', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new PanelOled());
