import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, drawRGB } from '@core/math/quantization';

function rgbToYCoCg(img: { w: number; h: number; data: Uint8ClampedArray }, channel: 0 | 1 | 2): { w: number; h: number; data: Uint8ClampedArray } {
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    const Y = Math.round((r + 2 * g + b) / 4);
    const Co = Math.round((r - b) / 2 + 128);
    const Cg = Math.round(g - (r + b) / 2 + 128);
    let v = 0;
    if (channel === 0) v = Y;
    else if (channel === 1) v = Co;
    else v = Cg;
    out[i] = v; out[i + 1] = v; out[i + 2] = v; out[i + 3] = 255;
  }
  return { w: img.w, h: img.h, data: out };
}

function channelStdDev(img: { w: number; h: number; data: Uint8ClampedArray }, ch: number): number {
  let sum = 0, sum2 = 0, n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = img.data[i + ch]; sum += v; sum2 += v * v; n++;
  }
  const m = sum / n;
  return Math.sqrt(sum2 / n - m * m);
}

function rgbToYCoCgImage(img: { w: number; h: number; data: Uint8ClampedArray }): { w: number; h: number; data: Uint8ClampedArray } {
  // Pack Y, Co, Cg into R/G/B for correlation stats
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    out[i] = Math.round((r + 2 * g + b) / 4);
    out[i + 1] = Math.round((r - b) / 2 + 128);
    out[i + 2] = Math.round(g - (r + b) / 2 + 128);
    out[i + 3] = 255;
  }
  return { w: img.w, h: img.h, data: out };
}

class YCoCg {
  private stage: CanvasStage;
  private c = 1;
  private src = syntheticRGBImage();

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 1);
    const s = document.getElementById('c') as EncSlider; s.value = this.c;
    s.addEventListener('input', (e) => { this.c = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('c', () => Math.round(this.c));
    document.addEventListener('reset-params', () => { this.c = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = rgbToYCoCg(this.src, (this.c - 1) as 0 | 1 | 2);
    const labels = ['Y (luminance)', 'Co (orange-blue)', 'Cg (green-magenta)'];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`channel: ${labels[this.c - 1]} · YCoCg-R (Malvar 2008)`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original (truecolor)', M + imgW / 2, M + 26);
    drawRGB(g, this.src, M, M + 30, scale);

    g.fillText(labels[this.c - 1], M + imgW + 30 + imgW / 2, M + 26);
    drawRGB(g, out, M + imgW + 30, M + 30, scale);

    // Stddev bar chart for RGB vs YCoCg
    const sy = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('per-channel std-dev (higher = more entropy, more bits)', M, sy);

    const yco = rgbToYCoCgImage(this.src);
    const rgbStd = [channelStdDev(this.src, 0), channelStdDev(this.src, 1), channelStdDev(this.src, 2)];
    const ycoStd = [channelStdDev(yco, 0), channelStdDev(yco, 1), channelStdDev(yco, 2)];
    const labelsBar = [
      { lbl: 'R', val: rgbStd[0], col: '#c2382c' },
      { lbl: 'G', val: rgbStd[1], col: '#1a6a3a' },
      { lbl: 'B', val: rgbStd[2], col: '#1f3a8a' },
      { lbl: 'Y', val: ycoStd[0], col: '#3a3a3a' },
      { lbl: 'Co', val: ycoStd[1], col: '#7a5020' },
      { lbl: 'Cg', val: ycoStd[2], col: '#5a7020' },
    ];
    const maxVal = Math.max(...labelsBar.map(d => d.val));
    const bw = 50, bh = 100;
    for (let i = 0; i < labelsBar.length; i++) {
      const x = M + i * (bw + 20);
      const ch = (labelsBar[i].val / maxVal) * bh;
      g.fillStyle = labelsBar[i].col;
      g.fillRect(x, sy + 30 + bh - ch, bw, ch);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x, sy + 30 + bh - ch, bw, ch);
      g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'center';
      g.fillText(labelsBar[i].lbl, x + bw / 2, sy + 30 + bh + 14);
      g.font = '10px serif';
      g.fillText(labelsBar[i].val.toFixed(1), x + bw / 2, sy + 30 + bh - ch - 4);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.beginPath(); g.moveTo(M, sy + 30 + bh); g.lineTo(M + 6 * (bw + 20), sy + 30 + bh); g.stroke();

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('YCoCg-R is integer-reversible (lift); used by JPEG-XR, HEVC RExt, and inside AV1 for high-fidelity colour.', M, h - M);
  }
}

new YCoCg();
