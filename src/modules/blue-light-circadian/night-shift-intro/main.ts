import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { planckianXY } from '@core/math/illuminants';
import { linearSrgbFromXyz } from '@core/math/color-adaptation';

// warm-white multiplicative tint (R,G,B in 0..1, normalised to max channel = 1) for a CCT
function cctTint(T: number): [number, number, number] {
  const { x, y } = planckianXY(T);
  const X = x / y, Y = 1, Z = (1 - x - y) / y;
  const lin = linearSrgbFromXyz([X, Y, Z]).map((c) => Math.max(0, c)) as [number, number, number];
  const m = Math.max(lin[0], lin[1], lin[2]) || 1;
  return [lin[0] / m, lin[1] / m, lin[2] / m];
}

const SWATCHES = ['#ffffff', '#e9e4d8', '#3a6ea5', '#c0392b', '#27ae60', '#f1c40f'];

class NightShift {
  private stage: CanvasStage;
  private cct = 6500;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cct = hydrateNumber('cct', 6500);
    const s = document.getElementById('cct') as EncSlider;
    s.value = this.cct;
    s.addEventListener('input', (e) => { this.cct = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cct', () => Math.round(this.cct));
    document.addEventListener('reset-params', () => { this.cct = 6500; s.value = 6500; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const [tr, tg, tb] = cctTint(this.cct);
    const tint = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.round(((n >> 16) & 255) * tr), g = Math.round(((n >> 8) & 255) * tg), b = Math.round((n & 255) * tb);
      return `rgb(${r},${g},${b})`;
    };

    // background (the screen's white, warmed)
    ctx.fillStyle = tint('#f4f1ea'); ctx.fillRect(0, 0, w, h);
    // mock UI card
    const cx = 70, cy = 60, cw = w - 140, ch = h - 150;
    ctx.fillStyle = tint('#ffffff'); ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, cw, ch);
    // header bar
    ctx.fillStyle = tint('#3a6ea5'); ctx.fillRect(cx, cy, cw, 46);
    // text lines (gray bars)
    ctx.fillStyle = tint('#cfc9bd');
    for (let i = 0; i < 4; i++) ctx.fillRect(cx + 28, cy + 78 + i * 26, cw * (0.7 - i * 0.08), 12);
    // swatch row
    const sw = 58, gap = 18, sx = cx + 28, sy = cy + ch - 90;
    SWATCHES.forEach((hex, i) => { ctx.fillStyle = tint(hex); ctx.fillRect(sx + i * (sw + gap), sy, sw, 58); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.strokeRect(sx + i * (sw + gap), sy, sw, 58); });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.cct)} K — ${this.cct >= 6000 ? 'cool daylight white, full blue' : this.cct >= 4000 ? 'neutral, blue eased back' : 'warm amber, blue strongly cut'}`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new NightShift());
