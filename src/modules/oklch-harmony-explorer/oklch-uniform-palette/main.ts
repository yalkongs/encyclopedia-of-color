import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { oklchToOklab, oklabToLinSrgb } from '@core/math/oklab';
import { srgbCss } from '@core/math/color-adaptation';
import { srgbInGamut } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type V3 = [number, number, number];
const N = 12;

class OklchPalette {
  private stage: CanvasStage;
  private L = 62; private C = 13; private H = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 62); this.C = hydrateNumber('C', 13); this.H = hydrateNumber('H', 30);
    for (const [k, set] of [['L', (v: number) => (this.L = v)], ['C', (v: number) => (this.C = v)], ['H', (v: number) => (this.H = v)]] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { set((e as CustomEvent).detail.value); this.draw(); notifyStateChange(); });
    }
    registerStateParam('L', () => Math.round(this.L));
    registerStateParam('C', () => Math.round(this.C));
    registerStateParam('H', () => Math.round(this.H));
    document.addEventListener('reset-params', () => {
      this.L = 62; this.C = 13; this.H = 30;
      (document.getElementById('L') as EncSlider).value = 62;
      (document.getElementById('C') as EncSlider).value = 13;
      (document.getElementById('H') as EncSlider).value = 30;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const L = this.L / 100, C = this.C / 100;
    const cx = w * 0.5, cy = h * 0.5 - 6;
    const R = Math.min(w, h) * 0.34;
    let inGamut = 0;

    for (let i = 0; i < N; i++) {
      const hue = (this.H + i * 360 / N) % 360;
      const lin = oklabToLinSrgb(oklchToOklab([L, C, hue] as V3));
      const ok = srgbInGamut(lin);
      if (ok) inGamut++;
      const ang = (-90 + i * 360 / N) * Math.PI / 180;
      const px = cx + R * Math.cos(ang), py = cy + R * Math.sin(ang);
      const rad = Math.min(w, h) * 0.072;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fillStyle = srgbCss(lin); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = theme.inkAlpha(0.35); ctx.stroke();
      if (!ok) {
        ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px - rad * 0.7, py - rad * 0.7); ctx.lineTo(px + rad * 0.7, py + rad * 0.7); ctx.stroke();
      }
      ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${hue.toFixed(0)}°`, px, py + rad + 13);
    }

    // centre base swatch
    const base = oklabToLinSrgb(oklchToOklab([L, C, this.H] as V3));
    ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.085, 0, Math.PI * 2);
    ctx.fillStyle = srgbCss(base); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = theme.goldDeep; ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`L ${this.L}%  ·  C ${(C).toFixed(2)}  ·  ${inGamut}/${N} hues inside sRGB`, 24, h - 16);
    if (inGamut < N) {
      ctx.fillStyle = theme.crimson; ctx.font = '12px Inter, sans-serif';
      ctx.fillText('✕ = out of gamut at this L, C', 24, 26);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new OklchPalette());
