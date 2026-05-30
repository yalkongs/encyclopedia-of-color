import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, medianCutQuantize, drawRGB, drawPalette } from '@core/math/quantization';

class MedianCut {
  private stage: CanvasStage;
  private k = 16;
  private src = syntheticRGBImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.k = hydrateNumber('k', 16);
    const s = document.getElementById('k') as EncSlider; s.value = this.k;
    s.addEventListener('input', (e) => { this.k = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('k', () => Math.round(this.k));
    document.addEventListener('reset-params', () => { this.k = 16; s.value = 16; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = medianCutQuantize(this.src, this.k);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`median-cut palette · k = ${this.k} colours`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original (truecolor)', M + imgW / 2, M + 26);
    drawRGB(g, this.src, M, M + 30, scale);

    g.fillText(`quantized · k = ${this.k}`, M + imgW + 30 + imgW / 2, M + 26);
    drawRGB(g, out, M + imgW + 30, M + 30, scale);

    // Palette
    const py = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText(`adapted palette (${out.palette.length} swatches)`, M, py);
    drawPalette(g, out.palette, M, py + 10, 20, 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('GIF default quantizer (1987–today). Splits the longest colour-cube axis at the median pixel-count, then averages each bucket.', M, h - M);
  }
}

new MedianCut();
