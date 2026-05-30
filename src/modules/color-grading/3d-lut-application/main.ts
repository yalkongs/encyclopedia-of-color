import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// LUT generating function — a "warm cinema" recipe: lift shadows blue, boost mids warm, gain orange
function lutOut(r: number, g: number, b: number): [number, number, number] {
  // Shadows shift to teal (negative R add, positive G/B)
  const wShadow = Math.max(0, 1 - (r + g + b) / 3 * 1.5);
  // Highlights shift to orange (positive R, slight G, negative B)
  const wHi = Math.max(0, (r + g + b) / 3 - 0.5) * 2;
  // Mids contrast +
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  const s = 1.2;
  const r2 = Math.max(0, Math.min(1, lum + (r - lum) * s + wShadow * (-0.05) + wHi * 0.15));
  const g2 = Math.max(0, Math.min(1, lum + (g - lum) * s + wShadow * 0.03 + wHi * 0.05));
  const b2 = Math.max(0, Math.min(1, lum + (b - lum) * s + wShadow * 0.08 + wHi * (-0.15)));
  return [r2, g2, b2];
}

// Sample the underlying recipe at grid corners → 3D LUT of size N
function buildLUT(N: number): Float32Array {
  const data = new Float32Array(N * N * N * 3);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      for (let k = 0; k < N; k++) {
        const [r, g, b] = lutOut(i / (N - 1), j / (N - 1), k / (N - 1));
        const idx = (i * N * N + j * N + k) * 3;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
      }
    }
  }
  return data;
}

function sampleLUT(lut: Float32Array, N: number, r: number, g: number, b: number): [number, number, number] {
  const x = r * (N - 1), y = g * (N - 1), z = b * (N - 1);
  const i0 = Math.floor(x), j0 = Math.floor(y), k0 = Math.floor(z);
  const i1 = Math.min(N - 1, i0 + 1), j1 = Math.min(N - 1, j0 + 1), k1 = Math.min(N - 1, k0 + 1);
  const dx = x - i0, dy = y - j0, dz = z - k0;
  const at = (i: number, j: number, k: number, c: number) => lut[(i * N * N + j * N + k) * 3 + c];
  const out: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const c000 = at(i0, j0, k0, c);
    const c100 = at(i1, j0, k0, c);
    const c010 = at(i0, j1, k0, c);
    const c110 = at(i1, j1, k0, c);
    const c001 = at(i0, j0, k1, c);
    const c101 = at(i1, j0, k1, c);
    const c011 = at(i0, j1, k1, c);
    const c111 = at(i1, j1, k1, c);
    const c00 = c000 * (1 - dx) + c100 * dx;
    const c10 = c010 * (1 - dx) + c110 * dx;
    const c01 = c001 * (1 - dx) + c101 * dx;
    const c11 = c011 * (1 - dx) + c111 * dx;
    const c0 = c00 * (1 - dy) + c10 * dy;
    const c1 = c01 * (1 - dy) + c11 * dy;
    out[c] = c0 * (1 - dz) + c1 * dz;
  }
  return out;
}

class Lut3D {
  private stage: CanvasStage;
  private N = 17;
  private px = 65; private py = 50; private pz = 35;
  private lut: Float32Array;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.N = hydrateNumber('N', 17);
    this.px = hydrateNumber('px', 65); this.py = hydrateNumber('py', 50); this.pz = hydrateNumber('pz', 35);
    this.lut = buildLUT(this.N);
    const bind = (id: string, set: (v: number) => void, rebuild = false) => {
      const s = document.getElementById(id) as EncSlider; s.value = ({ N: this.N, px: this.px, py: this.py, pz: this.pz } as Record<string, number>)[id];
      s.addEventListener('input', (e) => { set((e as CustomEvent).detail.value); if (rebuild) this.lut = buildLUT(this.N); this.draw(); notifyStateChange(); });
      return s;
    };
    const sN = bind('N', (v) => this.N = v, true);
    const sPx = bind('px', (v) => this.px = v);
    const sPy = bind('py', (v) => this.py = v);
    const sPz = bind('pz', (v) => this.pz = v);
    registerStateParam('N', () => Math.round(this.N));
    registerStateParam('px', () => Math.round(this.px));
    registerStateParam('py', () => Math.round(this.py));
    registerStateParam('pz', () => Math.round(this.pz));
    document.addEventListener('reset-params', () => {
      this.N = 17; this.px = 65; this.py = 50; this.pz = 35; this.lut = buildLUT(this.N);
      sN.value = 17; sPx.value = 65; sPy.value = 50; sPz.value = 35;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`3D LUT ${this.N}³ = ${this.N ** 3} cells · "warm cinema" recipe`, M, M);

    // Gradient row: hue gradient before / after
    const gy = M + 14;
    const gw = w - 2 * M;
    const gh = 60;
    g.fillStyle = theme.ink; g.font = '11px serif';
    g.fillText('gradient input → output (sampled at every pixel)', M, gy + 12);

    const img = g.createImageData(Math.floor(gw), gh);
    for (let x = 0; x < gw; x++) {
      const t = x / (gw - 1);
      // input: linear sweep from blue to orange
      const r = t, gIn = 0.5 * t + 0.2 * (1 - t), b = 1 - t;
      const inIdx = x * 4;
      const upper = img.data;
      // top half = input, bottom half = LUT output
      for (let y = 0; y < gh / 2; y++) {
        const i = (y * Math.floor(gw) + x) * 4;
        upper[i] = Math.round(r * 255);
        upper[i + 1] = Math.round(gIn * 255);
        upper[i + 2] = Math.round(b * 255);
        upper[i + 3] = 255;
      }
      const [or, og, ob] = sampleLUT(this.lut, this.N, r, gIn, b);
      for (let y = gh / 2; y < gh; y++) {
        const i = (y * Math.floor(gw) + x) * 4;
        upper[i] = Math.round(or * 255);
        upper[i + 1] = Math.round(og * 255);
        upper[i + 2] = Math.round(ob * 255);
        upper[i + 3] = 255;
      }
      void inIdx;
    }
    g.putImageData(img, M, gy + 20);
    g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(M, gy + 20, gw, gh);
    g.fillStyle = theme.inkAlpha(0.65); g.font = '10px serif';
    g.fillText('input', M + 2, gy + 32);
    g.fillText('LUT output', M + 2, gy + 20 + gh / 2 + 12);

    // Cube view: show 8 corner colours around the slider point
    const cy = gy + 20 + gh + 24;
    const cw = w - 2 * M;
    const cubeSize = 240;
    const cubeX = M + cw / 2 - cubeSize / 2;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('enclosing voxel: 8 corner cells + sampled output', M, cy - 4);

    const r = this.px / 100, gn = this.py / 100, b = this.pz / 100;
    const x = r * (this.N - 1), y = gn * (this.N - 1), z = b * (this.N - 1);
    const i0 = Math.floor(x), j0 = Math.floor(y), k0 = Math.floor(z);
    const i1 = Math.min(this.N - 1, i0 + 1), j1 = Math.min(this.N - 1, j0 + 1), k1 = Math.min(this.N - 1, k0 + 1);

    // Project 8 corners into isometric-ish 2D
    const corners: [number, number, number, [number, number, number]][] = [];
    for (const ii of [i0, i1]) for (const jj of [j0, j1]) for (const kk of [k0, k1]) {
      const idx = (ii * this.N * this.N + jj * this.N + kk) * 3;
      const col: [number, number, number] = [this.lut[idx], this.lut[idx + 1], this.lut[idx + 2]];
      const fi = ii === i0 ? 0 : 1, fj = jj === j0 ? 0 : 1, fk = kk === k0 ? 0 : 1;
      const px2 = cubeX + cubeSize / 2 + (fi - 0.5) * cubeSize * 0.7 + (fk - 0.5) * cubeSize * 0.3;
      const py2 = cy + 30 + cubeSize / 2 + (fj - 0.5) * cubeSize * 0.7 - (fk - 0.5) * cubeSize * 0.3;
      corners.push([px2, py2, fk, col]);
    }
    // Draw back-to-front by k
    corners.sort((a, b) => a[2] - b[2]);
    for (const [cx, cyy, , col] of corners) {
      const sw = 32;
      g.fillStyle = `rgb(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)})`;
      g.fillRect(cx - sw / 2, cyy - sw / 2, sw, sw);
      g.strokeStyle = theme.ink; g.strokeRect(cx - sw / 2, cyy - sw / 2, sw, sw);
    }
    // Sampled output in centre
    const [or, og, ob] = sampleLUT(this.lut, this.N, r, gn, b);
    const ccx = cubeX + cubeSize / 2, ccy = cy + 30 + cubeSize / 2;
    g.fillStyle = `rgb(${Math.round(or * 255)},${Math.round(og * 255)},${Math.round(ob * 255)})`;
    g.beginPath(); g.arc(ccx, ccy, 22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.stroke();
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`out (${(or * 255).toFixed(0)}, ${(og * 255).toFixed(0)}, ${(ob * 255).toFixed(0)})`, ccx, ccy + 38);

    // Read-out
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText(`input (${(r * 255).toFixed(0)}, ${(gn * 255).toFixed(0)}, ${(b * 255).toFixed(0)})  ·  cube cell (${i0}..${i1}, ${j0}..${j1}, ${k0}..${k1})`, M, ccy + 60);
    if (this.N <= 5) {
      g.fillStyle = theme.crimson;
      g.fillText('low resolution — visible banding on the gradient because each voxel covers a large RGB range', M, ccy + 78);
    }
  }
}

new Lut3D();
