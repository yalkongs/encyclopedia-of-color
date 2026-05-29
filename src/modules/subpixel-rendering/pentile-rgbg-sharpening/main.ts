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

class PenTile {
  private stage: CanvasStage;
  private layout = 'pentile';
  private sharpen = 60;
  private off: HTMLCanvasElement;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.off = document.createElement('canvas');
    this.stage.addEventListener('stageresize', () => this.draw());
    this.layout = hydrateFromUrl('layout') ?? 'pentile';
    this.sharpen = hydrateNumber('sharpen', 60);
    const t = document.getElementById('layout') as EncToggle;
    t.value = this.layout;
    t.addEventListener('change', (e) => { this.layout = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('layout', () => this.layout);
    const s = document.getElementById('sharpen') as EncSlider;
    s.value = this.sharpen;
    s.addEventListener('input', (e) => { this.sharpen = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sharpen', () => Math.round(this.sharpen));
    document.addEventListener('reset-params', () => {
      this.layout = 'pentile'; this.sharpen = 60; t.value = 'pentile'; s.value = 60; this.draw(); notifyStateChange();
    });
  }

  // per-pixel luminance of black text on white (1 = white, 0 = ink)
  private rasterize(cols: number, rows: number): number[] {
    const oc = this.off; oc.width = cols; oc.height = rows;
    const octx = oc.getContext('2d')!;
    octx.fillStyle = '#fff'; octx.fillRect(0, 0, cols, rows);
    octx.fillStyle = '#000'; octx.textBaseline = 'middle'; octx.textAlign = 'left';
    octx.font = `700 ${Math.round(rows * 0.74)}px Georgia, serif`;
    octx.fillText('Pixel', 2, rows / 2 + 1);
    const data = octx.getImageData(0, 0, cols, rows).data;
    const lum: number[] = [];
    for (let i = 0; i < cols * rows; i++) lum[i] = data[i * 4] / 255;
    return lum;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f6f4ee'; ctx.fillRect(0, 0, w, h);

    const cols = 64, rows = 16;
    const lum = this.rasterize(cols, rows);
    const pentile = this.layout === 'pentile';
    const s = this.sharpen / 100;

    // half-resolution red/blue base per row (box-average of pixel pairs), then unsharp
    const px = Math.min((w - 60) / cols, (h - 96) / rows), x0 = (w - cols * px) / 2, y0 = 46;
    for (let y = 0; y < rows; y++) {
      const row = (x: number) => lum[y * cols + Math.max(0, Math.min(cols - 1, x))];
      // pair base
      const pairs = Math.ceil(cols / 2);
      const base: number[] = [];
      for (let p = 0; p < pairs; p++) base[p] = (row(2 * p) + row(2 * p + 1)) / 2;
      const blur = (p: number) => (base[Math.max(0, p - 1)] + 2 * base[p] + base[Math.min(pairs - 1, p + 1)]) / 4;
      const sharp: number[] = [];
      for (let p = 0; p < pairs; p++) sharp[p] = Math.max(0, Math.min(1, base[p] + s * (base[p] - blur(p))));

      for (let c = 0; c < cols; c++) {
        let R: number, G: number, B: number;
        if (pentile) {
          G = row(c);
          R = B = sharp[Math.floor(c / 2)];
        } else {
          R = G = B = row(c);
        }
        ctx.fillStyle = `rgb(${Math.round(R * 255)},${Math.round(G * 255)},${Math.round(B * 255)})`;
        ctx.fillRect(x0 + c * px, y0 + y * px, px + 0.5, px + 0.5);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, cols * px, rows * px);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(pentile
      ? `PenTile — half-res red & blue; sharpening ${Math.round(this.sharpen)}% sets the fringe and halo strength`
      : 'RGB stripe — full red, green, and blue per pixel; edges stay neutral', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PenTile());
