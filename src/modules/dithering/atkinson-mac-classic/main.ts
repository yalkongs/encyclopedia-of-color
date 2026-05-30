import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawImage } from '@core/math/convolution';
import { floydSteinberg, atkinson, gradientImage } from '@core/math/dither';

class AtkinsonDemo {
  private stage: CanvasStage;
  private l = 2;
  private src = gradientImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.l = hydrateNumber('l', 2);
    const s = document.getElementById('l') as EncSlider; s.value = this.l;
    s.addEventListener('input', (e) => { this.l = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('l', () => Math.round(this.l));
    document.addEventListener('reset-params', () => { this.l = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const at = atkinson(this.src, this.l);
    const fs = floydSteinberg(this.src, this.l);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`levels = ${this.l} · Atkinson vs Floyd-Steinberg`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original gradient', M + imgW / 2, M + 26);
    drawImage(g, this.src, M, M + 30, scale);

    g.fillText('Atkinson (Mac 1984)', M + imgW + 30 + imgW / 2, M + 26);
    drawImage(g, at, M + imgW + 30, M + 30, scale);

    g.fillText('Floyd-Steinberg', M + 2 * (imgW + 30) + imgW / 2, M + 26);
    drawImage(g, fs, M + 2 * (imgW + 30), M + 30, scale);

    // Atkinson kernel diagram
    const ky = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Atkinson kernel (6 × 1/8 — total 6/8, drops 2/8)', M, ky);
    const cell = 36;
    const cells = [
      { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
      { x: 0, y: 2 },
    ];
    const ox = M + 30 + 2 * cell, oy = ky + 20 + cell;
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1;
    for (let yy = -1; yy <= 3; yy++) for (let xx = -3; xx <= 2; xx++) {
      g.strokeRect(M + 30 + (xx + 3) * cell, ky + 20 + (yy + 1) * cell, cell - 1, cell - 1);
    }
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'center';
    g.fillText('×', ox + cell / 2, oy + cell / 2 + 4);
    for (const c of cells) {
      g.fillStyle = '#d3f0d3';
      g.fillRect(ox + c.x * cell, oy + c.y * cell, cell - 1, cell - 1);
      g.fillStyle = theme.ink; g.textAlign = 'center'; g.font = '11px serif';
      g.fillText('1/8', ox + c.x * cell + cell / 2, oy + c.y * cell + cell / 2 + 4);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Atkinson loses 25 % of error → darker midtones but crisper edges. The "Mac look" comes from this trade-off.', M, h - M);
  }
}

new AtkinsonDemo();
