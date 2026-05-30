import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function gauss(): number {
  const u1 = Math.random() || 1e-9, u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function poisson(mean: number): number {
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss()));
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// True scene: a low-light gradient + a few "light dot" features
function sceneSignal(x: number, y: number, W: number, H: number): number {
  // Dim background (mean 8 photons), brighter strip in middle
  let s = 8;
  const dx = x - W * 0.5, dy = y - H * 0.5;
  if (Math.abs(dy) < H * 0.1) s = 20;
  // A few small bright dots
  for (const [bx, by, br, bv] of [[W * 0.3, H * 0.3, 5, 50], [W * 0.7, H * 0.65, 4, 80], [W * 0.5, H * 0.5, 3, 100]] as [number, number, number, number][]) {
    if ((x - bx) ** 2 + (y - by) ** 2 < br * br) s = bv;
  }
  void dx;
  return s;
}

const READ_NOISE = 4;

class NightMode {
  private stage: CanvasStage;
  private N = 8;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.N = hydrateNumber('N', 8);
    const s = document.getElementById('N') as EncSlider; s.value = this.N;
    s.addEventListener('input', (e) => { this.N = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('N', () => Math.round(this.N));
    document.addEventListener('reset-params', () => { this.N = 8; s.value = 8; this.draw(); notifyStateChange(); });
  }

  // Render a single capture (Poisson + Gaussian read noise) at scene scale (signal multiplied to fit 0..255)
  private renderSingle(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, scale = 3) {
    const W = Math.floor(w), H = Math.floor(h);
    const img = g.createImageData(W, H);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const s = sceneSignal(px, py, W, H);
      const captured = poisson(s);
      const v = Math.max(0, Math.min(255, (captured + READ_NOISE * gauss()) * scale));
      const i = (py * W + px) * 4;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, x, y);
  }

  // Render the average of N captures
  private renderAverage(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, N: number, scale = 3) {
    const W = Math.floor(w), H = Math.floor(h);
    const acc = new Float32Array(W * H);
    for (let n = 0; n < N; n++) {
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const s = sceneSignal(px, py, W, H);
        const v = poisson(s) + READ_NOISE * gauss();
        acc[py * W + px] += v;
      }
    }
    const img = g.createImageData(W, H);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const mean = acc[py * W + px] / N;
      const v = Math.max(0, Math.min(255, mean * scale));
      const i = (py * W + px) * 4;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, x, y);
  }

  // Predicted SNR for the brightest dot
  private snrForRegion(signalMean: number, N: number): { sigmaSingle: number; sigmaMerged: number; snrSingle: number; snrMerged: number } {
    const sigmaSingle = Math.sqrt(signalMean + READ_NOISE * READ_NOISE);
    const sigmaMerged = sigmaSingle / Math.sqrt(N);
    return {
      sigmaSingle,
      sigmaMerged,
      snrSingle: signalMean / sigmaSingle,
      snrMerged: signalMean / sigmaMerged,
    };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 28;
    const panelW = (w - 3 * M) / 2;
    const panelH = 280;

    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('single short-exposure capture', M, M + 12);
    g.fillText(`average of N = ${this.N} frames`, M + panelW + M, M + 12);

    this.renderSingle(g, M, M + 20, panelW, panelH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, M + 20, panelW, panelH);

    this.renderAverage(g, M + panelW + M, M + 20, panelW, panelH, this.N);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + panelW + M, M + 20, panelW, panelH);

    // Stats
    const sy = M + 20 + panelH + 24;
    const dim = this.snrForRegion(8, this.N);
    const mid = this.snrForRegion(20, this.N);
    const bright = this.snrForRegion(80, this.N);

    g.fillStyle = theme.crimson; g.font = '13px serif';
    g.fillText('per-region noise (electrons-equivalent) and SNR', M, sy);

    g.fillStyle = theme.ink; g.font = '12px monospace';
    g.fillText(`background (signal 8): σ ${dim.sigmaSingle.toFixed(1)} → ${dim.sigmaMerged.toFixed(1)}   SNR ${dim.snrSingle.toFixed(2)} → ${dim.snrMerged.toFixed(2)}`, M, sy + 20);
    g.fillText(`midtone   (signal 20): σ ${mid.sigmaSingle.toFixed(1)} → ${mid.sigmaMerged.toFixed(1)}   SNR ${mid.snrSingle.toFixed(2)} → ${mid.snrMerged.toFixed(2)}`, M, sy + 38);
    g.fillText(`bright dot(signal 80): σ ${bright.sigmaSingle.toFixed(1)} → ${bright.sigmaMerged.toFixed(1)}   SNR ${bright.snrSingle.toFixed(2)} → ${bright.snrMerged.toFixed(2)}`, M, sy + 56);

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(`merged noise σ = single σ / √N = single σ / ${Math.sqrt(this.N).toFixed(2)}`, M, sy + 80);
    g.fillStyle = theme.inkAlpha(0.55);
    g.fillText('Real night-mode pipelines also align frames (handles small handshake) and tonemap the result. The √N gain is the core trick.', M, sy + 98);
  }
}

new NightMode();
