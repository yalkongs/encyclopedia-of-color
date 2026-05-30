import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function gradientScene(): { w: number; h: number; data: Uint8ClampedArray } {
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const off = (y * w + x) * 4;
    let r = 0, g = 0, b = 0;
    if (y < h * 0.45) {
      // sky
      const t = y / (h * 0.45);
      r = Math.round(140 + 70 * (1 - t)); g = Math.round(180 + 50 * (1 - t)); b = Math.round(230 - 30 * t);
    } else if (y < h * 0.65) {
      // mountains
      r = 100; g = 110; b = 130;
    } else {
      // grass
      const t = (y - h * 0.65) / (h * 0.35);
      r = Math.round(60 + 40 * t); g = Math.round(120 + 50 * t); b = Math.round(40);
    }
    d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  return { w, h, data: d };
}

function rgbToL(img: { w: number; h: number; data: Uint8ClampedArray }): { w: number; h: number; data: Uint8ClampedArray } {
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = Math.round(0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]);
    out[i] = lum; out[i + 1] = lum; out[i + 2] = lum; out[i + 3] = 255;
  }
  return { w: img.w, h: img.h, data: out };
}

function fakeColorize(gray: { w: number; h: number; data: Uint8ClampedArray }, gt: { w: number; h: number; data: Uint8ClampedArray }, temp: number): { w: number; h: number; data: Uint8ClampedArray } {
  // Predict ab by attenuating the ground-truth deviation by (1/temp): high T → richer, low T → grayer
  const out = new Uint8ClampedArray(gray.data.length);
  for (let i = 0; i < gray.data.length; i += 4) {
    const L = gray.data[i];
    const r = gt.data[i], g = gt.data[i + 1], b = gt.data[i + 2];
    // Compute Cb and Cr from gt
    const Cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
    const Cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;
    // Damped chroma
    const k = Math.min(1.5, temp);
    const CbD = (Cb - 128) * k + 128;
    const CrD = (Cr - 128) * k + 128;
    const R = Math.max(0, Math.min(255, L + 1.402 * (CrD - 128)));
    const G = Math.max(0, Math.min(255, L - 0.344 * (CbD - 128) - 0.714 * (CrD - 128)));
    const B = Math.max(0, Math.min(255, L + 1.772 * (CbD - 128)));
    out[i] = R; out[i + 1] = G; out[i + 2] = B; out[i + 3] = 255;
  }
  return { w: gray.w, h: gray.h, data: out };
}

function drawImg(g: CanvasRenderingContext2D, img: { w: number; h: number; data: Uint8ClampedArray }, x: number, y: number, scale: number) {
  const id = g.createImageData(img.w * scale, img.h * scale);
  for (let py = 0; py < img.h; py++) for (let px = 0; px < img.w; px++) {
    const src = (py * img.w + px) * 4;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const dst = ((py * scale + dy) * img.w * scale + (px * scale + dx)) * 4;
      id.data[dst] = img.data[src]; id.data[dst + 1] = img.data[src + 1]; id.data[dst + 2] = img.data[src + 2]; id.data[dst + 3] = 255;
    }
  }
  g.putImageData(id, x, y);
}

class CNNColorisation {
  private stage: CanvasStage;
  private t = 0.7;
  private gt = gradientScene();
  private gray = rgbToL(this.gt);

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 0.7);
    const s = document.getElementById('t') as EncSlider; s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => this.t.toFixed(2));
    document.addEventListener('reset-params', () => { this.t = 0.7; s.value = 0.7; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const colourised = fakeColorize(this.gray, this.gt, this.t);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Temperature = ${this.t.toFixed(2)} (low = conservative / muted, high = bold / saturated)`, M, M);

    const scale = 4;
    const imgW = this.gt.w * scale, imgH = this.gt.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('grayscale input (L*)', M + imgW / 2, M + 26);
    drawImg(g, this.gray, M, M + 30, scale);

    g.fillText(`CNN prediction (T=${this.t.toFixed(2)})`, M + imgW + 30 + imgW / 2, M + 26);
    drawImg(g, colourised, M + imgW + 30, M + 30, scale);

    g.fillText('ground truth', M + 2 * (imgW + 30) + imgW / 2, M + 26);
    drawImg(g, this.gt, M + 2 * (imgW + 30), M + 30, scale);

    // Architecture sketch
    const ay = M + 30 + imgH + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Zhang 2016 colourisation network — U-Net regressing a*b* from L*', M, ay);

    // Boxes representing layers
    const stages = [
      { name: 'L* input', w: 80 }, { name: 'conv ×8', w: 80 }, { name: 'down 2', w: 70 },
      { name: 'conv ×8', w: 80 }, { name: 'down 2', w: 70 }, { name: 'bottleneck', w: 90 },
      { name: 'up 2', w: 60 }, { name: 'conv ×8', w: 80 }, { name: 'up 2', w: 60 },
      { name: '256-bin ab', w: 100 },
    ];
    let bx = M;
    const by = ay + 20, bh = 36;
    for (const s of stages) {
      g.fillStyle = '#e8eef4';
      g.fillRect(bx, by, s.w, bh);
      g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(bx, by, s.w, bh);
      g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(s.name, bx + s.w / 2, by + bh / 2 + 4);
      bx += s.w + 8;
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Conservative L2 loss → desaturated greys; classification + class-rebalancing → bolder colours; GAN loss (DeOldify) → most vibrant.', M, h - M);
  }
}

new CNNColorisation();
