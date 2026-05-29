import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [r + m, g + m, b + m];
}

class HsvCylinder {
  private stage: CanvasStage;
  private v = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.v = hydrateNumber('v', 100);
    (document.getElementById('v') as EncSlider).value = this.v;
    registerStateParam('v', () => this.v);
    (document.getElementById('v') as EncSlider).addEventListener('input', (e) => {
      this.v = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.v = 100;
      (document.getElementById('v') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const V = this.v / 100;

    const cx = w * 0.36, cy = h * 0.5, R = Math.min(w * 0.26, h * 0.4), step = 3;
    for (let sy = -R; sy <= R; sy += step) {
      for (let sx = -R; sx <= R; sx += step) {
        const r = Math.hypot(sx, sy); if (r > R) continue;
        const hue = (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
        const [rr, gg, bb] = hsvToRgb(hue, r / R, V);
        ctx.fillStyle = `rgb(${Math.round(rr * 255)},${Math.round(gg * 255)},${Math.round(bb * 255)})`;
        ctx.fillRect(cx + sx, cy + sy, step, step);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('hue = angle · saturation = radius', cx, cy + R + 22);
    ctx.textAlign = 'left';

    // Side profile: hexcone (apex at bottom, full at top).
    const sx0 = w * 0.72, sw = w * 0.22, sh = h * 0.6, sy0 = 50;
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(sx0 + sw / 2, sy0 + sh); ctx.lineTo(sx0, sy0); ctx.lineTo(sx0 + sw, sy0); ctx.closePath(); ctx.stroke();
    const sliceY = sy0 + sh - V * sh, halfW = (V * sw) / 2;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx0 + sw / 2 - halfW, sliceY); ctx.lineTo(sx0 + sw / 2 + halfW, sliceY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('value ↑', sx0 + sw / 2, sy0 + sh + 18); ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`value = ${this.v}%`, w * 0.08, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new HsvCylinder());
