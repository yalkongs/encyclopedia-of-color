import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const K_HK = 0.45; // illustrative H-K coefficient

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

class ShiftHK {
  private stage: CanvasStage;
  private hue = 240; private sat = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 240); this.sat = hydrateNumber('sat', 80);
    for (const id of ['hue', 'sat'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.hue = 240; this.sat = 80;
      (document.getElementById('hue') as EncSlider).value = 240;
      (document.getElementById('sat') as EncSlider).value = 80;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const [r, g, b] = hslToRgb(this.hue, this.sat / 100, 0.5);
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; // relative luminance, matched
    const gv = Math.round(Y * 255);
    const chroma = this.sat / 100;
    const boost = K_HK * chroma;

    const sw = w * 0.26, sh = h * 0.42, sy = 60;
    const cX = w * 0.16, gX = w * 0.58;
    ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    ctx.fillRect(cX, sy, sw, sh);
    ctx.fillStyle = `rgb(${gv},${gv},${gv})`;
    ctx.fillRect(gX, sy, sw, sh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(cX, sy, sw, sh); ctx.strokeRect(gX, sy, sw, sh);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('saturated colour', cX + sw / 2, sy - 10);
    ctx.fillText('luminance-matched grey', gX + sw / 2, sy - 10);
    ctx.textAlign = 'left';

    // Luminance meter (equal) + H-K boost bar.
    const my = sy + sh + 48, mx = w * 0.16, mw = w * 0.68;
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`luminance Y = ${(Y * 100).toFixed(0)}  (identical for both patches)`, mx, my);
    ctx.fillStyle = theme.paperRecess; ctx.fillRect(mx, my + 14, mw, 22);
    ctx.fillStyle = theme.gold; ctx.fillRect(mx, my + 14, Math.min(1, boost / 0.5) * mw, 22);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(mx, my + 14, mw, 22);
    ctx.fillStyle = theme.ink; ctx.fillText(`H-K brightness boost ≈ +${(boost * 100).toFixed(0)}%`, mx, my + 52);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('the pixels are equal in luminance — your eye reports the colour brighter', mx, my + 80);
  }
}
window.addEventListener('DOMContentLoaded', () => new ShiftHK());
