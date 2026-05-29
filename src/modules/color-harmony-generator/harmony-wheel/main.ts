import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { oklchToOklab, oklabToLinSrgb } from '@core/math/oklab';
import { srgbCss } from '@core/math/color-adaptation';
import { srgbInGamut } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const SCHEMES: Record<string, number[]> = {
  comp: [0, 180], triad: [0, 120, 240], analog: [0, 30, -30],
  tetrad: [0, 90, 180, 270], split: [0, 150, 210],
};

class HarmonyWheel {
  private stage: CanvasStage;
  private hue = 250; private L = 65; private C = 15; private scheme = 'triad';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 250); this.L = hydrateNumber('L', 65); this.C = hydrateNumber('C', 15); this.scheme = hydrateFromUrl('scheme') ?? 'triad';
    for (const k of ['hue', 'L', 'C'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const t = document.getElementById('scheme') as EncToggle;
    t.value = this.scheme;
    t.addEventListener('change', (e) => { this.scheme = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('scheme', () => this.scheme);
    document.addEventListener('reset-params', () => {
      this.hue = 250; this.L = 65; this.C = 15; this.scheme = 'triad';
      (document.getElementById('hue') as EncSlider).value = 250; (document.getElementById('L') as EncSlider).value = 65; (document.getElementById('C') as EncSlider).value = 15; t.value = 'triad'; this.draw(); notifyStateChange();
    });
  }

  private colorAt(hueDeg: number): { css: string; inG: boolean } {
    const lin = oklabToLinSrgb(oklchToOklab([this.L / 100, this.C / 100, ((hueDeg % 360) + 360) % 360]));
    return { css: srgbCss(lin), inG: srgbInGamut(lin) };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const cx = Math.min(w * 0.34, h * 0.5), cy = h * 0.46, R = Math.min(w * 0.3, h * 0.4);

    // hue ring at chosen L,C
    for (let a = 0; a < 360; a += 2) {
      const c = this.colorAt(a);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (-90 + a) * Math.PI / 180, (-90 + a + 2.5) * Math.PI / 180); ctx.closePath();
      ctx.fillStyle = c.inG ? c.css : theme.inkAlpha(0.08); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.fillStyle = theme.paperBg; ctx.fill();

    // harmony polygon + markers
    const hues = SCHEMES[this.scheme].map((d) => this.hue + d);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.5; ctx.beginPath();
    hues.forEach((hh, i) => { const a = (-90 + hh) * Math.PI / 180; const x = cx + R * 0.78 * Math.cos(a), y = cy + R * 0.78 * Math.sin(a); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    if (hues.length > 2) ctx.closePath(); ctx.stroke();
    hues.forEach((hh) => {
      const a = (-90 + hh) * Math.PI / 180, x = cx + R * 0.78 * Math.cos(a), y = cy + R * 0.78 * Math.sin(a);
      const c = this.colorAt(hh);
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fillStyle = c.css; ctx.fill(); ctx.strokeStyle = theme.ink; ctx.lineWidth = 2; ctx.stroke();
    });

    // swatch row
    const sx = cx + R + 50, sw = Math.min(70, (w - sx - 30) / hues.length - 8), sy = cy - 35;
    hues.forEach((hh, i) => {
      const c = this.colorAt(hh);
      const x = sx + i * (sw + 8);
      ctx.fillStyle = c.css; ctx.fillRect(x, sy, sw, 70);
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x, sy, sw, 70);
      if (!c.inG) { ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + sw, sy + 70); ctx.stroke(); }
      ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${((hh % 360) + 360) % 360 | 0}°`, x + sw / 2, sy + 84);
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${this.scheme} harmony · OKLCH L ${this.L}% C ${(this.C / 100).toFixed(2)}`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new HarmonyWheel());
