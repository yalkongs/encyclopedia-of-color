import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type RGB = [number, number, number];
function hueColor(h: number): RGB {
  const c = 1, hp = (((h % 360) + 360) % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [r, g, b];
}
const cssOf = (c: RGB) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

class Ostwald {
  private stage: CanvasStage;
  private hue = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 30);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => this.hue);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 30;
      (document.getElementById('hue') as EncSlider).value = 30;
      this.draw(); notifyStateChange();
    });
  }

  // Barycentric colour in triangle (A=apex W, B=apex black, F=full colour).
  private fillTriangle(ctx: CanvasRenderingContext2D, A: number[], B: number[], F: number[], col: RGB) {
    const den = (B[1] - F[1]) * (A[0] - F[0]) + (F[0] - B[0]) * (A[1] - F[1]);
    const minX = Math.min(A[0], B[0], F[0]), maxX = Math.max(A[0], B[0], F[0]);
    const minY = Math.min(A[1], B[1], F[1]), maxY = Math.max(A[1], B[1], F[1]);
    fillRegionAA(ctx, minX, minY, maxX, maxY, (px, py) => {
      const a = ((B[1] - F[1]) * (px - F[0]) + (F[0] - B[0]) * (py - F[1])) / den;
      const b = ((F[1] - A[1]) * (px - F[0]) + (A[0] - F[0]) * (py - F[1])) / den;
      const c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) return null;
      return [(a + c * col[0]) * 255, (a + c * col[1]) * 255, (a + c * col[2]) * 255];
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const cx = w * 0.36, cy = h * 0.48, Vy = h * 0.34, Hx = w * 0.24;
    const W = [cx, cy - Vy], B = [cx, cy + Vy], Fr = [cx + Hx, cy], Fl = [cx - Hx, cy];
    this.fillTriangle(ctx, W, B, Fr, hueColor(this.hue));
    this.fillTriangle(ctx, W, B, Fl, hueColor(this.hue + 180));
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(Fr[0], Fr[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(Fl[0], Fl[1]); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('white', cx, W[1] - 8); ctx.fillText('black', cx, B[1] + 16);
    ctx.fillText('full colour', Fr[0] + 4, Fr[1] - 8); ctx.fillText('complement', Fl[0] - 4, Fl[1] - 8);
    ctx.textAlign = 'left';

    // Hue ring with complementary markers.
    const hx = w * 0.78, hy = h * 0.42, hr = Math.min(w * 0.12, h * 0.2);
    for (let d = 0; d < 360; d += 3) {
      const a0 = (d - 90) * Math.PI / 180;
      ctx.fillStyle = cssOf(hueColor(d));
      ctx.beginPath(); ctx.arc(hx, hy, hr, a0, a0 + 0.06); ctx.arc(hx, hy, hr * 0.62, a0 + 0.06, a0, true); ctx.closePath(); ctx.fill();
    }
    for (const hh of [this.hue, this.hue + 180]) {
      const a = (hh - 90) * Math.PI / 180;
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * hr * 0.6, hy + Math.sin(a) * hr * 0.6); ctx.lineTo(hx + Math.cos(a) * hr * 1.08, hy + Math.sin(a) * hr * 1.08); ctx.stroke();
    }

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('the axial slice through the double cone — hue and complement', w * 0.06, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Ostwald());
