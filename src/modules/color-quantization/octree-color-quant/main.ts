import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, RGB, drawRGB, drawPalette } from '@core/math/quantization';

/** Top-`depth`-bit truncation per channel — equivalent to octree leaves at depth d before merging. */
function octreeBucket(img: { w: number; h: number; data: Uint8ClampedArray }, depth: number): { w: number; h: number; data: Uint8ClampedArray; palette: RGB[] } {
  const mask = 0xff << (8 - depth) & 0xff;
  const fill = (1 << (8 - depth)) >> 1;
  const out = new Uint8ClampedArray(img.data.length);
  const paletteSet = new Set<number>();
  for (let i = 0; i < img.data.length; i += 4) {
    const r = (img.data[i] & mask) + fill;
    const g = (img.data[i + 1] & mask) + fill;
    const b = (img.data[i + 2] & mask) + fill;
    const rc = Math.min(255, r), gc = Math.min(255, g), bc = Math.min(255, b);
    out[i] = rc; out[i + 1] = gc; out[i + 2] = bc; out[i + 3] = 255;
    paletteSet.add((rc << 16) | (gc << 8) | bc);
  }
  const palette: RGB[] = Array.from(paletteSet).map(v => ({ r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff }));
  return { w: img.w, h: img.h, data: out, palette };
}

class Octree {
  private stage: CanvasStage;
  private d = 4;
  private src = syntheticRGBImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 4);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 4; s.value = 4; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = octreeBucket(this.src, this.d);
    const maxLeaves = (1 << this.d) ** 3;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`depth = ${this.d} bits/ch · max leaves = ${maxLeaves} · used = ${out.palette.length}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original (truecolor)', M + imgW / 2, M + 26);
    drawRGB(g, this.src, M, M + 30, scale);

    g.fillText(`octree depth ${this.d}`, M + imgW + 30 + imgW / 2, M + 26);
    drawRGB(g, out, M + imgW + 30, M + 30, scale);

    // Octree visualisation (binary subdivision)
    const ty = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('octree levels (RGB cube subdivision)', M, ty);
    const cellSize = 200, cellPad = 20;
    const baseX = M, baseY = ty + 10;
    for (let level = 0; level <= Math.min(this.d, 4); level++) {
      const x = baseX + level * (cellSize / 5 + cellPad);
      const subdiv = 1 << level;
      const subSize = cellSize / 6;
      // Draw nested squares as a simplification of 8-cell octree subdivision
      const sub = subSize * subdiv;
      g.fillStyle = 'rgba(0,0,0,0.06)';
      g.fillRect(x, baseY, sub, sub);
      for (let i = 0; i <= subdiv; i++) {
        const xx = x + i * subSize;
        const yy = baseY + i * subSize;
        g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 0.5;
        g.beginPath(); g.moveTo(xx, baseY); g.lineTo(xx, baseY + sub); g.stroke();
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x + sub, yy); g.stroke();
      }
      g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(`L=${level} · ${(1 << level) ** 3} bins`, x + sub / 2, baseY + sub + 14);
    }

    // Palette swatches
    const px = M, py = ty + 100;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('used palette (first 200 swatches)', px, py);
    drawPalette(g, out.palette.slice(0, 200), px, py + 10, 12, 32);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Octree quant is streamable: O(N) insert + bottom-up merge until ≤ k leaves. Used in early Java AWT and DNG tools.', M, h - M);
  }
}

new Octree();
