import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { SRGB, DISPLAY_P3, ADOBE_RGB, mul3, type RgbSpace } from '@core/math/rgb-spaces';

const SOURCES: Record<string, RgbSpace> = { p3: DISPLAY_P3, adobe: ADOBE_RGB, srgb: SRGB };
const SRC_LABEL: Record<string, string> = { p3: 'Display P3', adobe: 'Adobe RGB', srgb: 'sRGB' };
const COLORS = [
  [0.90, 0.15, 0.20], [0.20, 0.72, 0.32], [0.20, 0.35, 0.85],
  [0.88, 0.66, 0.14], [0.60, 0.22, 0.72], [0.86, 0.56, 0.46],
];

const dec = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encG = (c: number) => { const x = Math.max(0, Math.min(1, c)); return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255); };

class ColorSync {
  private stage: CanvasStage;
  private managed = 'on';
  private src = 'p3';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.managed = hydrateFromUrl('managed') ?? 'on';
    this.src = hydrateFromUrl('src') ?? 'p3';
    const tm = document.getElementById('managed') as EncToggle;
    tm.value = this.managed;
    tm.addEventListener('change', (e) => { this.managed = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('managed', () => this.managed);
    const ts = document.getElementById('src') as EncToggle;
    ts.value = this.src;
    ts.addEventListener('change', (e) => { this.src = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('src', () => this.src);
    document.addEventListener('reset-params', () => { this.managed = 'on'; this.src = 'p3'; tm.value = 'on'; ts.value = 'p3'; this.draw(); notifyStateChange(); });
  }

  // managed: source-encoded RGB → linear → XYZ → sRGB → encode
  private managedCss(rgb: number[], space: RgbSpace): string {
    const lin = rgb.map(dec) as [number, number, number];
    const xyz = mul3(space.toXyz, lin);
    const ds = mul3(SRGB.fromXyz, xyz);
    return `rgb(${encG(ds[0])},${encG(ds[1])},${encG(ds[2])})`;
  }
  // unmanaged: raw numbers shown as sRGB
  private rawCss(rgb: number[]): string { return `rgb(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)})`; }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const space = SOURCES[this.src];
    const isManaged = this.managed === 'on';

    // pipeline boxes
    const boxes = isManaged
      ? [`${SRC_LABEL[this.src]} source`, 'PCS (XYZ/Lab)', 'display profile']
      : [`${SRC_LABEL[this.src]} source`, '— bypassed —', 'shown as sRGB'];
    const bw = (w - 120) / 3, by = 40, bh = 46;
    boxes.forEach((b, i) => {
      const bx = 40 + i * (bw + 20);
      ctx.fillStyle = (!isManaged && i === 1) ? 'rgba(155,40,40,0.12)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = (!isManaged && i === 1) ? theme.crimson : theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b, bx + bw / 2, by + bh / 2 + 4);
      if (i < 2) { ctx.fillStyle = theme.inkSoft; ctx.fillText('→', bx + bw + 10, by + bh / 2 + 5); }
    });

    // main swatch grid = current mode
    const cols = 3, rows = 2, gx = 40, gy = 130, gw = w - 80, gh = h - 130 - 130;
    const pw = gw / cols, ph = gh / rows, pad = 8;
    COLORS.forEach((c, i) => {
      const cc = i % cols, cr = Math.floor(i / cols);
      ctx.fillStyle = isManaged ? this.managedCss(c, space) : this.rawCss(c);
      ctx.fillRect(gx + cc * pw + pad, gy + cr * ph + pad, pw - pad * 2, ph - pad * 2);
      ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(gx + cc * pw + pad, gy + cr * ph + pad, pw - pad * 2, ph - pad * 2);
    });
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(isManaged ? 'as rendered (colour-managed)' : 'as rendered (unmanaged — numbers read as sRGB)', gx, gy - 8);

    // intended reference strip (always managed)
    const sy = gy + gh + 22, sh2 = 40, swp = gw / COLORS.length;
    COLORS.forEach((c, i) => { ctx.fillStyle = this.managedCss(c, space); ctx.fillRect(gx + i * swp, sy, swp - 6, sh2); });
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(gx, sy, gw - 6, sh2);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.fillText('intended colour (reference)', gx, sy - 6);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(isManaged
      ? 'managed — the rendered colours match the intended reference below'
      : (this.src === 'srgb' ? 'unmanaged, but an sRGB source already matches sRGB — no visible shift' : 'unmanaged — the same numbers, misread as sRGB, drift off the intended colour'), w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new ColorSync());
