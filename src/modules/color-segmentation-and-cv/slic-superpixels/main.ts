import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { syntheticRGBImage, srgbToLab } from '@core/math/quantization';

interface Cluster { L: number; a: number; b: number; x: number; y: number; }

class SLIC {
  private stage: CanvasStage;
  private k = 48;
  private src = syntheticRGBImage();
  private m = 12; // compactness

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.k = hydrateNumber('k', 48);
    const s = document.getElementById('k') as EncSlider; s.value = this.k;
    s.addEventListener('input', (e) => { this.k = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('k', () => Math.round(this.k));
    document.addEventListener('reset-params', () => { this.k = 48; s.value = 48; this.draw(); notifyStateChange(); });
  }

  private slic(): { assign: Int32Array; clusters: Cluster[] } {
    const { w, h, data } = this.src;
    const N = w * h;
    const S = Math.sqrt((w * h) / this.k);
    // Initialise grid of cluster centres
    const cols = Math.max(1, Math.round(w / S));
    const rows = Math.max(1, Math.round(h / S));
    const clusters: Cluster[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * (w / cols);
      const cy = (r + 0.5) * (h / rows);
      const [L, a, b] = srgbToLab(data[(Math.round(cy) * w + Math.round(cx)) * 4], data[(Math.round(cy) * w + Math.round(cx)) * 4 + 1], data[(Math.round(cy) * w + Math.round(cx)) * 4 + 2]);
      clusters.push({ L, a, b, x: cx, y: cy });
    }
    const assign = new Int32Array(N).fill(-1);

    // Precompute Lab for all pixels
    const labs = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const [L, a, b] = srgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      labs[i * 3] = L; labs[i * 3 + 1] = a; labs[i * 3 + 2] = b;
    }

    const iters = 4;
    for (let it = 0; it < iters; it++) {
      // Assignment within 2S window
      const dists = new Float32Array(N).fill(Infinity);
      for (let ci = 0; ci < clusters.length; ci++) {
        const c = clusters[ci];
        const x0 = Math.max(0, Math.floor(c.x - S)), x1 = Math.min(w - 1, Math.floor(c.x + S));
        const y0 = Math.max(0, Math.floor(c.y - S)), y1 = Math.min(h - 1, Math.floor(c.y + S));
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          const i = yy * w + xx;
          const dL = labs[i * 3] - c.L, da = labs[i * 3 + 1] - c.a, db = labs[i * 3 + 2] - c.b;
          const dc = dL * dL + da * da + db * db;
          const dx = xx - c.x, dy = yy - c.y;
          const ds = dx * dx + dy * dy;
          const D = dc + (ds * this.m * this.m) / (S * S);
          if (D < dists[i]) { dists[i] = D; assign[i] = ci; }
        }
      }
      // Update centres
      const sumL = new Float32Array(clusters.length);
      const sumA = new Float32Array(clusters.length);
      const sumB = new Float32Array(clusters.length);
      const sumX = new Float32Array(clusters.length);
      const sumY = new Float32Array(clusters.length);
      const counts = new Int32Array(clusters.length);
      for (let i = 0; i < N; i++) {
        const a = assign[i]; if (a < 0) continue;
        sumL[a] += labs[i * 3]; sumA[a] += labs[i * 3 + 1]; sumB[a] += labs[i * 3 + 2];
        sumX[a] += i % w; sumY[a] += Math.floor(i / w);
        counts[a]++;
      }
      for (let ci = 0; ci < clusters.length; ci++) {
        if (counts[ci] > 0) {
          clusters[ci].L = sumL[ci] / counts[ci];
          clusters[ci].a = sumA[ci] / counts[ci];
          clusters[ci].b = sumB[ci] / counts[ci];
          clusters[ci].x = sumX[ci] / counts[ci];
          clusters[ci].y = sumY[ci] / counts[ci];
        }
      }
    }
    return { assign, clusters };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const { assign, clusters } = this.slic();

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`SLIC k = ${this.k} → ${clusters.length} clusters · compactness m = ${this.m}`, M, M);

    const scale = 4;
    const imgW = this.src.w * scale, imgH = this.src.h * scale;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('original', M + imgW / 2, M + 26);
    // Render original
    const id = g.createImageData(imgW, imgH);
    for (let py = 0; py < this.src.h; py++) for (let px = 0; px < this.src.w; px++) {
      const src = (py * this.src.w + px) * 4;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * imgW + (px * scale + dx)) * 4;
        id.data[dst] = this.src.data[src];
        id.data[dst + 1] = this.src.data[src + 1];
        id.data[dst + 2] = this.src.data[src + 2];
        id.data[dst + 3] = 255;
      }
    }
    g.putImageData(id, M, M + 30);

    // Render mean colour per superpixel + boundaries
    g.fillText('SLIC mean-colour superpixels + boundaries', M + imgW + 30 + imgW / 2, M + 26);
    // Compute mean colours
    const sums = new Float64Array(clusters.length * 3);
    const counts = new Int32Array(clusters.length);
    for (let i = 0; i < this.src.w * this.src.h; i++) {
      const c = assign[i]; if (c < 0) continue;
      sums[c * 3] += this.src.data[i * 4];
      sums[c * 3 + 1] += this.src.data[i * 4 + 1];
      sums[c * 3 + 2] += this.src.data[i * 4 + 2];
      counts[c]++;
    }
    const mean = new Uint8ClampedArray(clusters.length * 3);
    for (let c = 0; c < clusters.length; c++) {
      if (counts[c] > 0) {
        mean[c * 3] = Math.round(sums[c * 3] / counts[c]);
        mean[c * 3 + 1] = Math.round(sums[c * 3 + 1] / counts[c]);
        mean[c * 3 + 2] = Math.round(sums[c * 3 + 2] / counts[c]);
      }
    }
    const id2 = g.createImageData(imgW, imgH);
    for (let py = 0; py < this.src.h; py++) for (let px = 0; px < this.src.w; px++) {
      const c = assign[py * this.src.w + px];
      let r = mean[c * 3] ?? 0, gC = mean[c * 3 + 1] ?? 0, b = mean[c * 3 + 2] ?? 0;
      // Boundary check: if any neighbour belongs to a different cluster, draw dark line
      let boundary = false;
      if (px > 0 && assign[py * this.src.w + px - 1] !== c) boundary = true;
      if (py > 0 && assign[(py - 1) * this.src.w + px] !== c) boundary = true;
      if (boundary) { r = 20; gC = 20; b = 20; }
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * imgW + (px * scale + dx)) * 4;
        id2.data[dst] = r; id2.data[dst + 1] = gC; id2.data[dst + 2] = b; id2.data[dst + 3] = 255;
      }
    }
    g.putImageData(id2, M + imgW + 30, M + 30);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('SLIC runs in O(N · iters); 200–1000 superpixels typical. Most CV libraries (OpenCV, scikit-image) ship SLIC implementations.', M, h - M);
  }
}

new SLIC();
