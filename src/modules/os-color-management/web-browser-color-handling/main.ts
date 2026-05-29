import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';
import { DISPLAY_P3, SRGB, mul3 } from '@core/math/rgb-spaces';

const dec = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encG = (c: number) => { const x = Math.max(0, Math.min(1, c)); return (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255; };

class BrowserColor {
  private stage: CanvasStage;
  private tagged = 'yes';
  private sat = 70;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tagged = hydrateFromUrl('tagged') ?? 'yes';
    this.sat = hydrateNumber('sat', 70);
    const t = document.getElementById('tagged') as EncToggle;
    t.value = this.tagged;
    t.addEventListener('change', (e) => { this.tagged = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tagged', () => this.tagged);
    const s = document.getElementById('sat') as EncSlider;
    s.value = this.sat;
    s.addEventListener('input', (e) => { this.sat = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sat', () => Math.round(this.sat));
    document.addEventListener('reset-params', () => { this.tagged = 'yes'; this.sat = 70; t.value = 'yes'; s.value = 70; this.draw(); notifyStateChange(); });
  }

  // source colours authored in P3, saturation-controlled
  private sources(): number[][] {
    const k = 0.5 * (1 - this.sat / 100);
    return [[0.95, k, k], [k, 0.92, k * 1.2], [k, k * 1.3, 0.95], [0.93, 0.85, k]];
  }
  private intendedCss(p3: number[]): string {
    const ds = mul3(SRGB.fromXyz, mul3(DISPLAY_P3.toXyz, p3.map(dec) as [number, number, number]));
    return `rgb(${Math.round(encG(ds[0]))},${Math.round(encG(ds[1]))},${Math.round(encG(ds[2]))})`;
  }
  private rawCss(p3: number[]): string { return `rgb(${Math.round(p3[0] * 255)},${Math.round(p3[1] * 255)},${Math.round(p3[2] * 255)})`; }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const isTagged = this.tagged === 'yes';
    const srcs = this.sources();

    // decision flow
    const fy = 44;
    ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
    const box = (x: number, label: string, hot: boolean) => {
      const bw = 150, bh = 42;
      ctx.fillStyle = hot ? 'rgba(176,57,47,0.14)' : 'rgba(0,0,0,0.04)'; ctx.fillRect(x, fy, bw, bh);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(x, fy, bw, bh);
      ctx.fillStyle = hot ? theme.crimson : theme.ink; ctx.fillText(label, x + bw / 2, fy + bh / 2 + 4);
      return x + bw;
    };
    let x = 40;
    x = box(x, 'asset', false); ctx.fillStyle = theme.inkSoft; ctx.fillText('→', x + 12, fy + 25); x += 26;
    x = box(x, isTagged ? 'has profile ✓' : 'no profile', !isTagged); ctx.fillStyle = theme.inkSoft; ctx.fillText('→', x + 12, fy + 25); x += 26;
    box(x, isTagged ? 'convert to display' : 'assume sRGB', !isTagged);

    // main swatches = current handling
    const cols = 4, gx = 40, gy = 130, gw = w - 80, gh = h - 130 - 130, pw = gw / cols, pad = 8;
    srcs.forEach((c, i) => {
      ctx.fillStyle = isTagged ? this.intendedCss(c) : this.rawCss(c);
      ctx.fillRect(gx + i * pw + pad, gy, pw - pad * 2, gh); ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(gx + i * pw + pad, gy, pw - pad * 2, gh);
    });
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(isTagged ? 'as displayed (profile converted)' : 'as displayed (assumed sRGB)', gx, gy - 8);

    // intended reference
    const sy = gy + gh + 22, sh2 = 40, swp = gw / srcs.length;
    srcs.forEach((c, i) => { ctx.fillStyle = this.intendedCss(c); ctx.fillRect(gx + i * swp, sy, swp - 6, sh2); });
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.fillText('intended colour (reference)', gx, sy - 6);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(isTagged
      ? 'tagged — converted to match the intended reference'
      : 'untagged — read as sRGB; the wider the source gamut, the bigger the drift', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new BrowserColor());
