import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class ClearType {
  private stage: CanvasStage;
  private mode = 'subpixel';
  private off: HTMLCanvasElement;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.off = document.createElement('canvas');
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mode = hydrateFromUrl('mode') ?? 'subpixel';
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.mode = 'subpixel'; t.value = 'subpixel'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f6f4ee'; ctx.fillRect(0, 0, w, h);
    // logical low-res glyph grid: cols pixels wide. Rasterise text at 3x width offscreen.
    const cols = 46, rows = 14, scaleX = 3;
    const oc = this.off; oc.width = cols * scaleX; oc.height = rows;
    const octx = oc.getContext('2d')!;
    octx.fillStyle = '#fff'; octx.fillRect(0, 0, oc.width, oc.height);
    octx.fillStyle = '#000'; octx.textBaseline = 'middle'; octx.textAlign = 'left';
    octx.save(); octx.scale(scaleX, 1); octx.font = '700 11px Georgia, serif'; octx.fillText('Reading', 2, rows / 2 + 1); octx.restore();
    const img = octx.getImageData(0, 0, oc.width, oc.height).data;
    const cover = (sx: number, y: number) => { if (sx < 0 || sx >= oc.width) return 1; const i = (y * oc.width + sx) * 4; return img[i] / 255; }; // 1=white,0=ink

    // draw magnified pixels
    const px = Math.min((w - 60) / cols, (h - 90) / rows), x0 = 30, y0 = 50;
    for (let y = 0; y < rows; y++) {
      for (let c = 0; c < cols; c++) {
        let R: number, G: number, B: number;
        if (this.mode === 'subpixel') { R = cover(c * 3, y); G = cover(c * 3 + 1, y); B = cover(c * 3 + 2, y); }
        else { const v = (cover(c * 3, y) + cover(c * 3 + 1, y) + cover(c * 3 + 2, y)) / 3; R = G = B = v; }
        ctx.fillStyle = `rgb(${Math.round(R * 255)},${Math.round(G * 255)},${Math.round(B * 255)})`;
        ctx.fillRect(x0 + c * px, y0 + y * px, px + 0.5, px + 0.5);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, cols * px, rows * px);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'subpixel' ? 'subpixel — crisp stems, with red/cyan fringes on the curves' : 'greyscale — neutral but softer edges', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new ClearType());
