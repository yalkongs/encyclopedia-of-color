import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const INVARIANTS = [478, 503, 578];
const SEG = [430, 478, 503, 578, 650];

/** Hue shift (in nm of effective wavelength) toward yellow/blue; 0 at invariants. */
function bezoldShift(lambda: number): number {
  let lo = SEG[0], hi = SEG[SEG.length - 1];
  for (let i = 0; i < SEG.length - 1; i++) if (lambda >= SEG[i] && lambda <= SEG[i + 1]) { lo = SEG[i]; hi = SEG[i + 1]; break; }
  const bump = Math.sin(Math.PI * (lambda - lo) / (hi - lo));
  const dir = lambda < 478 ? -1 : lambda > 578 ? -1 : 1; // toward blue below 478, toward yellow 478-578, toward yellow from red above 578
  return dir * 9 * bump;
}

function wavelengthRGB(lam: number): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440) { r = -(lam - 440) / 60; b = 1; }
  else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / 20; }
  else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / 65; }
  else { r = 1; }
  const ch = (x: number) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, x)), 0.8));
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

class ShiftBezold {
  private stage: CanvasStage;
  private lambda = 530; private intensity = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 530); this.intensity = hydrateNumber('intensity', 80);
    for (const id of ['lambda', 'intensity'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.lambda = 530; this.intensity = 80;
      (document.getElementById('lambda') as EncSlider).value = 530;
      (document.getElementById('intensity') as EncSlider).value = 80;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const dLam = bezoldShift(this.lambda) * (this.intensity / 100);
    const lamHigh = this.lambda + dLam;

    const sw = w * 0.26, sh = h * 0.36, sy = 56;
    const loX = w * 0.16, hiX = w * 0.58;
    ctx.fillStyle = wavelengthRGB(this.lambda); ctx.fillRect(loX, sy, sw, sh);
    ctx.fillStyle = wavelengthRGB(lamHigh); ctx.fillRect(hiX, sy, sw, sh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(loX, sy, sw, sh); ctx.strokeRect(hiX, sy, sw, sh);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('dim', loX + sw / 2, sy - 10);
    ctx.fillText('bright (same wavelength)', hiX + sw / 2, sy - 10);
    ctx.textAlign = 'left';

    // Wavelength axis with invariant marks.
    const ax = w * 0.16, aw = w * 0.68, ayy = sy + sh + 50;
    const xOf = (lam: number) => ax + ((lam - 430) / (650 - 430)) * aw;
    for (let l = 430; l < 650; l += 2) { ctx.fillStyle = wavelengthRGB(l); ctx.fillRect(xOf(l), ayy, (aw / 110) + 1, 12); }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(ax, ayy, aw, 12);
    for (const inv of INVARIANTS) {
      const x = xOf(inv);
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, ayy - 6); ctx.lineTo(x, ayy + 18); ctx.stroke();
      ctx.fillStyle = theme.ink; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${inv}`, x, ayy + 30);
    }
    // Current marker.
    const mx = xOf(this.lambda);
    ctx.fillStyle = theme.crimson; ctx.beginPath();
    ctx.moveTo(mx, ayy - 8); ctx.lineTo(mx - 5, ayy - 16); ctx.lineTo(mx + 5, ayy - 16); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'left';

    const onInv = INVARIANTS.some((i) => Math.abs(i - this.lambda) <= 2);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(onInv ? `λ ${this.lambda} nm is an invariant — no hue shift` : `λ ${this.lambda} nm → bright hue drifts ${dLam > 0 ? 'toward yellow' : 'toward blue'} (Δ ${dLam.toFixed(1)} nm)`, ax, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ShiftBezold());
