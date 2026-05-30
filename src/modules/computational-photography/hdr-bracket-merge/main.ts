import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Synthetic scene: an "interior view of a window" — bright window patch + dim interior wall + medium foreground
// Returns "true linear radiance" per pixel for an WxH grid
function trueRadiance(w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0.04; // dim interior wall
      // window in upper-right quadrant: extremely bright sky
      if (x > w * 0.55 && y < h * 0.55) {
        const wx = (x - w * 0.55) / (w * 0.45);
        const wy = (h * 0.55 - y) / (h * 0.55);
        r = 6.0 + Math.sin(wx * 8) * 0.6 + Math.cos(wy * 6) * 0.4; // window with cloud detail
      }
      // a person silhouette in front of the window — slightly dark
      const dx = x - w * 0.65, dy = y - h * 0.45;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < h * 0.18) r = 0.20;
      // foreground table edge across bottom
      if (y > h * 0.7) r = 0.30 + (y - h * 0.7) / h * 0.5;
      // mid-tone painting on the wall (left)
      if (x > w * 0.10 && x < w * 0.30 && y > h * 0.25 && y < h * 0.50) r = 0.6 + Math.sin(x * 0.3) * 0.1;
      out[y * w + x] = Math.max(0, r);
    }
  }
  return out;
}

// Capture: convert radiance to 8-bit pixel using shutter time t (in arbitrary units, where t=1 ≈ correctly exposed at mid-grey radiance 0.18)
function capture(rad: Float32Array, t: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rad.length);
  for (let i = 0; i < rad.length; i++) {
    const lin = rad[i] * t;
    // sRGB-like encoding (approx gamma 1/2.2)
    const enc = Math.min(1, Math.max(0, Math.pow(lin, 1 / 2.2)));
    out[i] = Math.round(enc * 255);
  }
  return out;
}

// Well-exposedness weight per pixel (Mertens-style)
function weight(p: number): number {
  const x = p / 255;
  return Math.exp(-Math.pow(x - 0.5, 2) / (2 * 0.25 * 0.25));
}

// Merge by weighted average in linear domain (reverse gamma)
function merge(p0: Uint8ClampedArray, p1: Uint8ClampedArray, p2: Uint8ClampedArray, t0: number, t1: number, t2: number): Float32Array {
  const out = new Float32Array(p0.length);
  for (let i = 0; i < p0.length; i++) {
    const v0 = p0[i], v1 = p1[i], v2 = p2[i];
    const w0 = weight(v0), w1 = weight(v1), w2 = weight(v2);
    const lin0 = Math.pow(v0 / 255, 2.2) / t0;
    const lin1 = Math.pow(v1 / 255, 2.2) / t1;
    const lin2 = Math.pow(v2 / 255, 2.2) / t2;
    const num = w0 * lin0 + w1 * lin1 + w2 * lin2;
    const den = w0 + w1 + w2 + 1e-9;
    out[i] = num / den;
  }
  return out;
}

// Reinhard tone map: L_d = L * (1 + L/Lmax²) / (1 + L)
function toneMap(rad: Float32Array, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rad.length);
  // Find Lmax for normalization
  let lmax = 0;
  for (let i = 0; i < rad.length; i++) if (rad[i] > lmax) lmax = rad[i];
  const lmax2 = lmax * lmax;
  for (let i = 0; i < rad.length; i++) {
    const L = rad[i];
    const Lmapped = strength > 0 ? (L * (1 + L / lmax2)) / (1 + L) : Math.min(1, L);
    const blend = strength / 100;
    const Lout = blend * Lmapped + (1 - blend) * Math.min(1, L);
    const enc = Math.pow(Math.max(0, Math.min(1, Lout)), 1 / 2.2);
    out[i] = Math.round(enc * 255);
  }
  return out;
}

class HDRMerge {
  private stage: CanvasStage;
  private tm = 60;
  // Cached frames at 80x52 resolution
  private W = 80; private H = 52;
  private rad: Float32Array;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tm = hydrateNumber('tm', 60);
    this.rad = trueRadiance(this.W, this.H);
    const s = document.getElementById('tm') as EncSlider; s.value = this.tm;
    s.addEventListener('input', (e) => { this.tm = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tm', () => Math.round(this.tm));
    document.addEventListener('reset-params', () => { this.tm = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private drawFrame(g: CanvasRenderingContext2D, pixels: Uint8ClampedArray, x: number, y: number, w: number, h: number) {
    const img = g.createImageData(this.W, this.H);
    for (let i = 0; i < pixels.length; i++) {
      img.data[i * 4] = pixels[i];
      img.data[i * 4 + 1] = pixels[i];
      img.data[i * 4 + 2] = pixels[i];
      img.data[i * 4 + 3] = 255;
    }
    // Create a tiny offscreen canvas for source, then drawImage to scale
    const off = document.createElement('canvas');
    off.width = this.W; off.height = this.H;
    off.getContext('2d')!.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(off, x, y, w, h);
    g.imageSmoothingEnabled = true;
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(x, y, w, h);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 24;
    // Captures: three exposures at t = 1/4, 1, 4 (i.e., -2 EV, 0 EV, +2 EV)
    const t0 = 0.25, t1 = 1.0, t2 = 4.0;
    const cap0 = capture(this.rad, t0);
    const cap1 = capture(this.rad, t1);
    const cap2 = capture(this.rad, t2);

    // Merge + tone-map
    const merged = merge(cap0, cap1, cap2, t0, t1, t2);
    const tonemapped = toneMap(merged, this.tm);

    // Layout: 4 frames in a row
    const cellW = (w - 5 * M) / 4;
    const cellH = cellW * (this.H / this.W);
    const cy = M + 20;

    const labels = ['−2 EV', '0 EV', '+2 EV', `merged + tone-map · ${this.tm}%`];
    const frames = [cap0, cap1, cap2, tonemapped];

    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      const x = M + i * (cellW + M);
      g.fillText(labels[i], x + cellW / 2, M + 14);
      this.drawFrame(g, frames[i], x, cy, cellW, cellH);
    }

    // Statistics row
    const sy = cy + cellH + 30;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('per-pixel exposure quality (well-exposedness weight)', M, sy);
    // For each exposure: % of pixels with high weight
    const fmt = (cap: Uint8ClampedArray) => {
      let good = 0, total = 0;
      for (let i = 0; i < cap.length; i++) { if (weight(cap[i]) > 0.5) good++; total++; }
      return ((good / total) * 100).toFixed(0);
    };
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    g.fillText(`−2 EV: ${fmt(cap0)}% pixels well-exposed (highlights kept, shadows lost)`, M, sy + 18);
    g.fillText(`0 EV : ${fmt(cap1)}% pixels well-exposed (mid-tones OK, some highlights blown)`, M, sy + 34);
    g.fillText(`+2 EV: ${fmt(cap2)}% pixels well-exposed (shadows kept, highlights blown to white)`, M, sy + 50);

    g.fillStyle = theme.crimson; g.font = '12px serif';
    g.fillText('After merge each pixel takes the best-exposed bracket — the tone-mapped frame keeps detail in both the window and the interior.', M, sy + 76);
  }
}

new HDRMerge();
