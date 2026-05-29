import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { fillRegionAA } from '@core/render/raster';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

class HslDoubleCone {
  private stage: CanvasStage;
  private l = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.l = hydrateNumber('l', 50);
    (document.getElementById('l') as EncSlider).value = this.l;
    registerStateParam('l', () => this.l);
    (document.getElementById('l') as EncSlider).addEventListener('input', (e) => {
      this.l = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.l = 50;
      (document.getElementById('l') as EncSlider).value = 50;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const L = this.l / 100;
    const chromaMax = 1 - Math.abs(2 * L - 1);

    const cx = w * 0.36, cy = h * 0.5, R = Math.min(w * 0.26, h * 0.4);
    const Rl = R * chromaMax;
    fillRegionAA(ctx, cx - Rl, cy - Rl, cx + Rl, cy + Rl, (x, y) => {
      const sx = x - cx, sy = y - cy;
      const r = Math.hypot(sx, sy); if (r > Rl) return null;
      const hue = (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
      const [rr, gg, bb] = hslToRgb(hue, Rl > 0 ? r / Rl : 0, L);
      return [rr * 255, gg * 255, bb * 255];
    });
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    if (Rl > 1) { ctx.beginPath(); ctx.arc(cx, cy, Rl, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('available chroma shrinks toward the apexes', cx, cy + R + 22);
    ctx.textAlign = 'left';

    // Side profile: double cone (diamond).
    const sx0 = w * 0.72, sw = w * 0.22, sh = h * 0.6, sy0 = 50;
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx0 + sw / 2, sy0); ctx.lineTo(sx0 + sw, sy0 + sh / 2); ctx.lineTo(sx0 + sw / 2, sy0 + sh); ctx.lineTo(sx0, sy0 + sh / 2); ctx.closePath(); ctx.stroke();
    const sliceY = sy0 + sh - L * sh, halfW = (chromaMax * sw) / 2;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx0 + sw / 2 - halfW, sliceY); ctx.lineTo(sx0 + sw / 2 + halfW, sliceY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('white', sx0 + sw / 2, sy0 - 6); ctx.fillText('black', sx0 + sw / 2, sy0 + sh + 16);
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`lightness = ${this.l}% · max chroma ${(chromaMax * 100).toFixed(0)}%`, w * 0.08, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new HslDoubleCone());
