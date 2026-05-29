import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToCss, labToXyz, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const DEG = Math.PI / 180;
const L_LIGHT = [99, 97.5, 95, 91.5, 88, 84, 79, 72, 58, 53, 44, 24];
const L_DARK = [17, 21, 25, 29, 33, 38, 43, 49, 58, 63, 73, 91];
const CSCALE = [0.04, 0.09, 0.18, 0.28, 0.42, 0.56, 0.7, 0.85, 1.0, 0.95, 0.78, 0.45];
const ROLES = ['app bg', 'subtle bg', 'ui bg', 'hover', 'active', 'subtle border', 'ui border', 'hover border', 'SOLID', 'solid hover', 'low text', 'high text'];

class RadixScale {
  private stage: CanvasStage;
  private hue = 206; private mode = 'light';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 206); this.mode = hydrateFromUrl('mode') ?? 'light';
    const s = document.getElementById('hue') as EncSlider;
    s.value = this.hue;
    s.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.hue = 206; this.mode = 'light'; s.value = 206; t.value = 'light'; this.draw(); notifyStateChange(); });
  }

  private step(i: number): Lab {
    const Ls = this.mode === 'light' ? L_LIGHT : L_DARK;
    const ca = Math.cos(this.hue * DEG), cb = Math.sin(this.hue * DEG);
    let c = CSCALE[i] * 45;
    while (c > 0 && !srgbInGamut(linearSrgbFromXyz(labToXyz([Ls[i], c * ca, c * cb] as Lab)))) c -= 2;
    return [Ls[i], c * ca, c * cb];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = this.mode === 'dark' ? '#1a1a22' : theme.paperBg; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 36, bw = (w - 60) / 12, bh = h - 140;
    for (let i = 0; i < 12; i++) {
      const lab = this.step(i);
      ctx.fillStyle = labToCss(lab); ctx.fillRect(x0 + i * bw, y0, bw - 2, bh);
      if (i === 8) { ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.5; ctx.strokeRect(x0 + i * bw, y0, bw - 2, bh); }
      ctx.fillStyle = lab[0] < 50 ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,30,0.8)'; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x0 + i * bw + bw / 2, y0 + bh - 10);
      ctx.save(); ctx.translate(x0 + i * bw + bw / 2, y0 + bh + 10); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i === 8 ? theme.crimson : (this.mode === 'dark' ? theme.inkHint : theme.inkMute); ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(ROLES[i], 0, 0); ctx.restore();
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, bw * 12 - 2, bh);
    ctx.fillStyle = this.mode === 'dark' ? theme.gold : theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('twelve steps, fixed roles — step 9 is the solid; 11/12 are text on backgrounds 1-3 (approximation)', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new RadixScale());
