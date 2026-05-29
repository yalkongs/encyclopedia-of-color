import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type RGB = [number, number, number];
// NCS unique hues at 0/90/180/270 = Y/R/B/G.
const STOPS: RGB[] = [[0.93, 0.82, 0.0], [0.82, 0.12, 0.10], [0.10, 0.22, 0.78], [0.05, 0.55, 0.28]];
function hueColor(deg: number): RGB {
  const t = ((deg % 360) + 360) % 360 / 90;
  const i = Math.floor(t) % 4, f = t - Math.floor(t);
  const a = STOPS[i], b = STOPS[(i + 1) % 4];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
const cssOf = (c: RGB) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

class Ncs {
  private stage: CanvasStage;
  private hue = 90;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 90);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => this.hue);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 90;
      (document.getElementById('hue') as EncSlider).value = 90;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const hc = hueColor(this.hue);

    // Triangle vertices: W top-left, S bottom-left, C right.
    const x0 = w * 0.12, y0 = h * 0.14, H = h * 0.66, Wd = w * 0.42;
    const W: [number, number] = [x0, y0], S: [number, number] = [x0, y0 + H], C: [number, number] = [x0 + Wd, y0 + H / 2];
    const den = (S[1] - C[1]) * (W[0] - C[0]) + (C[0] - S[0]) * (W[1] - C[1]);
    for (let py = y0; py <= y0 + H; py += 3) {
      for (let px = x0; px <= x0 + Wd; px += 3) {
        const a = ((S[1] - C[1]) * (px - C[0]) + (C[0] - S[0]) * (py - C[1])) / den;
        const b = ((C[1] - W[1]) * (px - C[0]) + (W[0] - C[0]) * (py - C[1])) / den;
        const c = 1 - a - b;
        if (a < 0 || b < 0 || c < 0) continue;
        ctx.fillStyle = cssOf([a * 1 + c * hc[0], a * 1 + c * hc[1], a * 1 + c * hc[2]]);
        ctx.fillRect(px, py, 3, 3);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(W[0], W[1]); ctx.lineTo(S[0], S[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = theme.ink; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('W', W[0] - 18, W[1] + 4); ctx.fillText('S', S[0] - 16, S[1] + 4); ctx.fillText('C', C[0] + 6, C[1] + 4);

    // Hue circle (Y top, R right, B bottom, G left).
    const hx = w * 0.78, hy = h * 0.42, hr = Math.min(w * 0.13, h * 0.22);
    for (let d = 0; d < 360; d += 3) {
      const a0 = (d - 90) * Math.PI / 180;
      ctx.fillStyle = cssOf(hueColor(d));
      ctx.beginPath(); ctx.arc(hx, hy, hr, a0, a0 + 0.06); ctx.arc(hx, hy, hr * 0.6, a0 + 0.06, a0, true); ctx.closePath(); ctx.fill();
    }
    const ma = (this.hue - 90) * Math.PI / 180;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx + Math.cos(ma) * hr * 0.55, hy + Math.sin(ma) * hr * 0.55); ctx.lineTo(hx + Math.cos(ma) * hr * 1.08, hy + Math.sin(ma) * hr * 1.08); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Y', hx, hy - hr - 6); ctx.fillText('B', hx, hy + hr + 14); ctx.fillText('R', hx + hr + 10, hy + 4); ctx.fillText('G', hx - hr - 10, hy + 4);
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('every interior point: whiteness + blackness + chromaticness = 100', x0, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Ncs());
