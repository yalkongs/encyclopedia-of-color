import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, uniformQuantize, drawRGB, drawPalette } from '@core/math/quantization';

class UniformQuant {
  private stage: CanvasStage;
  private n = 4;
  private src = syntheticRGBImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 4);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 4; s.value = 4; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = uniformQuantize(this.src, this.n);
    const total = this.n ** 3;
    const used = out.palette.length;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.n} × ${this.n} × ${this.n} = ${total} grid entries · ${used} actually used in image`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original (truecolor)', M + imgW / 2, M + 26);
    drawRGB(g, this.src, M, M + 30, scale);

    g.fillText(`uniform-quantized (${total} entries)`, M + imgW + 30 + imgW / 2, M + 26);
    drawRGB(g, out, M + imgW + 30, M + 30, scale);

    // Palette (subset shown)
    const py = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText(`grid palette (${used} cells)`, M, py);
    drawPalette(g, out.palette, M, py + 10, 18, 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('216-colour "web-safe" palette = 6³ uniform RGB cube — used by 8-bit indexed colour in the 1990s.', M, h - M);
  }
}

new UniformQuant();
