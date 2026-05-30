import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Canon 5D Mark III D65 ColorMatrix (XYZ → camera) — from dcraw
const COLOR_MATRIX = [
  [ 0.6347, -0.0479, -0.0972],
  [-0.8297,  1.5954,  0.2480],
  [-0.1968,  0.2131,  0.7649],
];
// Synthetic-but-plausible ForwardMatrix (camera → XYZ D50). DNG ForwardMatrix is fit so the
// adapted neutral white point lands on D50. We construct one that differs from the inverse
// of ColorMatrix to demonstrate the L5 point that the two are not inverses.
const FORWARD_MATRIX = [
  [ 0.7977,  0.1352,  0.0313],
  [ 0.2880,  0.7119, -0.0001],
  [ 0.0000,  0.0000,  0.8252],
];

function inv3(m: number[][]): number[][] {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [
    [(e * i - f * h) / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [-(d * i - f * g) / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [(d * h - e * g) / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}
function mul3(M: number[][], v: [number, number, number]): [number, number, number] {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}
function xyzToSrgb(xyz: [number, number, number]): [number, number, number] {
  const M = [
    [ 3.2406, -1.5372, -0.4986],
    [-0.9689,  1.8758,  0.0415],
    [ 0.0557, -0.2040,  1.0570],
  ];
  return mul3(M, xyz);
}
function srgbEncode(c: number): number {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function cssFromXYZ(xyz: [number, number, number]): string {
  const lin = xyzToSrgb(xyz);
  return `rgb(${Math.round(srgbEncode(lin[0]) * 255)},${Math.round(srgbEncode(lin[1]) * 255)},${Math.round(srgbEncode(lin[2]) * 255)})`;
}

class DngMatrices {
  private stage: CanvasStage;
  private cR = 50; private cG = 60; private cB = 35;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cR = hydrateNumber('cR', 50);
    this.cG = hydrateNumber('cG', 60);
    this.cB = hydrateNumber('cB', 35);
    const sR = document.getElementById('cR') as EncSlider; sR.value = this.cR;
    sR.addEventListener('input', (e) => { this.cR = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sG = document.getElementById('cG') as EncSlider; sG.value = this.cG;
    sG.addEventListener('input', (e) => { this.cG = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sB = document.getElementById('cB') as EncSlider; sB.value = this.cB;
    sB.addEventListener('input', (e) => { this.cB = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cR', () => Math.round(this.cR));
    registerStateParam('cG', () => Math.round(this.cG));
    registerStateParam('cB', () => Math.round(this.cB));
    document.addEventListener('reset-params', () => {
      this.cR = 50; this.cG = 60; this.cB = 35;
      sR.value = 50; sG.value = 60; sB.value = 35;
      this.draw(); notifyStateChange();
    });
  }

  private camRGB(): [number, number, number] {
    return [this.cR / 100, this.cG / 100, this.cB / 100];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const cam = this.camRGB();
    const xyz_via_inv = mul3(inv3(COLOR_MATRIX), cam);          // Path A
    const xyz_via_fwd = mul3(FORWARD_MATRIX, cam);              // Path B

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText('Canon 5D Mark III (D65 calibration) — two DNG matrices, two paths to XYZ', M, M);

    // Two matrix panels
    const matY = M + 22;
    const matW = (w - 3 * M) / 2;
    this.drawMatrix(g, 'ColorMatrix (XYZ → camera)', 'used: invert it to take camera → XYZ', COLOR_MATRIX, M, matY, matW, theme.crimson);
    this.drawMatrix(g, 'ForwardMatrix (camera → XYZ D50)', 'used: directly for rendering to PCS', FORWARD_MATRIX, M * 2 + matW, matY, matW, theme.gold);

    // Result swatches
    const swY = matY + 170;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('Camera native RGB input:', M, swY);
    g.fillStyle = `rgb(${Math.round(cam[0] * 255)},${Math.round(cam[1] * 255)},${Math.round(cam[2] * 255)})`;
    g.fillRect(M, swY + 8, 50, 50);
    g.strokeStyle = theme.ink; g.strokeRect(M, swY + 8, 50, 50);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`(${cam[0].toFixed(2)}, ${cam[1].toFixed(2)}, ${cam[2].toFixed(2)})`, M + 60, swY + 30);

    const swX = M + 280;
    const swW = 80;
    g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('Path A — invert ColorMatrix', swX, swY);
    g.fillStyle = cssFromXYZ(xyz_via_inv);
    g.fillRect(swX, swY + 8, swW, 50);
    g.strokeStyle = theme.ink; g.strokeRect(swX, swY + 8, swW, 50);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`XYZ ${xyz_via_inv[0].toFixed(3)} ${xyz_via_inv[1].toFixed(3)} ${xyz_via_inv[2].toFixed(3)}`, swX, swY + 78);

    const swX2 = swX + 240;
    g.fillStyle = theme.gold; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('Path B — ForwardMatrix direct', swX2, swY);
    g.fillStyle = cssFromXYZ(xyz_via_fwd);
    g.fillRect(swX2, swY + 8, swW, 50);
    g.strokeStyle = theme.ink; g.strokeRect(swX2, swY + 8, swW, 50);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`XYZ ${xyz_via_fwd[0].toFixed(3)} ${xyz_via_fwd[1].toFixed(3)} ${xyz_via_fwd[2].toFixed(3)}`, swX2, swY + 78);

    // Diff
    const dx = xyz_via_inv[0] - xyz_via_fwd[0];
    const dy = xyz_via_inv[1] - xyz_via_fwd[1];
    const dz = xyz_via_inv[2] - xyz_via_fwd[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const ry = swY + 110;
    g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`XYZ distance A vs B: ${dist.toFixed(3)}`, M, ry);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('Same camera RGB, two answers — because ColorMatrix was fit to predict camera response from XYZ (it then gets inverted for WB), while ForwardMatrix was fit so the camera neutral lands exactly on D50 in PCS.', M, ry + 18);
    g.fillStyle = theme.inkAlpha(0.6);
    g.fillText('That is why DNG stores both. The image converter uses ColorMatrix to estimate the as-shot illuminant, and ForwardMatrix to actually render the pixels.', M, ry + 36);
  }

  private drawMatrix(g: CanvasRenderingContext2D, label: string, sub: string, m: number[][], x: number, y: number, cw: number, accent: string) {
    g.fillStyle = accent; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(label, x, y);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif';
    g.fillText(sub, x, y + 14);
    const ry = y + 24;
    const cellH = 26;
    const cellW = cw / 3;
    g.strokeStyle = accent; g.lineWidth = 1;
    g.strokeRect(x, ry, cw, cellH * 3);
    for (let i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(x, ry + i * cellH); g.lineTo(x + cw, ry + i * cellH); g.stroke();
      g.beginPath(); g.moveTo(x + i * cellW, ry); g.lineTo(x + i * cellW, ry + cellH * 3); g.stroke();
    }
    g.fillStyle = theme.ink; g.font = '12px monospace'; g.textAlign = 'center';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const v = m[i][j];
      const s = (v >= 0 ? ' ' : '') + v.toFixed(3);
      g.fillText(s, x + (j + 0.5) * cellW, ry + i * cellH + 18);
    }
  }
}

new DngMatrices();
