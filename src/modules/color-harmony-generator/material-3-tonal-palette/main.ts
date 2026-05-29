import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToCss, labToXyz, srgbInGamut } from '@core/math/colorimetry';
import { linearSrgbFromXyz } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
const DEG = Math.PI / 180;
const ROLE: Record<number, string> = { 10: 'on-container', 40: 'primary', 90: 'container', 100: 'on-primary' };

class M3Palette {
  private stage: CanvasStage;
  private hue = 265; private C = 48;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 265); this.C = hydrateNumber('C', 48);
    for (const k of ['hue', 'C'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => { this.hue = 265; this.C = 48; (document.getElementById('hue') as EncSlider).value = 265; (document.getElementById('C') as EncSlider).value = 48; this.draw(); notifyStateChange(); });
  }

  private toneColor(T: number): Lab {
    const ca = Math.cos(this.hue * DEG), cb = Math.sin(this.hue * DEG);
    let c = this.C;
    while (c > 0 && !srgbInGamut(linearSrgbFromXyz(labToXyz([T, c * ca, c * cb] as Lab)))) c -= 2;
    return [T, c * ca, c * cb];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 36, bw = (w - 60) / TONES.length, bh = h - 130;
    TONES.forEach((T, i) => {
      const lab = this.toneColor(T);
      ctx.fillStyle = labToCss(lab); ctx.fillRect(x0 + i * bw, y0, bw - 2, bh);
      ctx.fillStyle = T < 50 ? 'rgba(255,255,255,0.85)' : theme.inkSoft; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(T), x0 + i * bw + bw / 2, y0 + bh - 10);
      if (ROLE[T]) {
        ctx.save(); ctx.translate(x0 + i * bw + bw / 2, y0 + bh + 8); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = theme.crimson; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(ROLE[T], 0, 0); ctx.restore();
      }
    });
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, bw * TONES.length - 2, bh);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('Tone = L*; roles are named tones (Primary 40, Container 90) — close approximation of Material HCT', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new M3Palette());
