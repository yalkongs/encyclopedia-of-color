import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { planckianXY } from '@core/math/illuminants';

// Convert CIE 1931 xy → CIE 1976 u'v'
function xyToUv(x: number, y: number): [number, number] {
  const d = -2 * x + 12 * y + 3;
  return [(4 * x) / d, (9 * y) / d];
}

// gain implied by a (T, tint) white-point — using von Kries on RGB primaries (simplified)
// Convert target white xy → XYZ → linear sRGB ratios, gain = (1/r, 1/g, 1/b) normalized
function xyzFromXY(x: number, y: number): [number, number, number] {
  return [x / y, 1, (1 - x - y) / y];
}
// sRGB linear matrix (D65) — for visualisation only
const M_RGB: number[][] = [
  [ 3.2406, -1.5372, -0.4986],
  [-0.9689,  1.8758,  0.0415],
  [ 0.0557, -0.2040,  1.0570],
];
function xyzToLin(xyz: [number, number, number]): [number, number, number] {
  return [
    M_RGB[0][0] * xyz[0] + M_RGB[0][1] * xyz[1] + M_RGB[0][2] * xyz[2],
    M_RGB[1][0] * xyz[0] + M_RGB[1][1] * xyz[1] + M_RGB[1][2] * xyz[2],
    M_RGB[2][0] * xyz[0] + M_RGB[2][1] * xyz[1] + M_RGB[2][2] * xyz[2],
  ];
}
function srgbEncode(c: number): number {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

class KelvinTint {
  private stage: CanvasStage;
  private kelvin = 5500;
  private tint = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.kelvin = hydrateNumber('kelvin', 5500);
    this.tint = hydrateNumber('tint', 0);

    const sK = document.getElementById('kelvin') as EncSlider;
    sK.value = this.kelvin;
    sK.addEventListener('input', (e) => { this.kelvin = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    const sT = document.getElementById('tint') as EncSlider;
    sT.value = this.tint;
    sT.addEventListener('input', (e) => { this.tint = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    registerStateParam('kelvin', () => Math.round(this.kelvin));
    registerStateParam('tint', () => Math.round(this.tint));

    document.addEventListener('reset-params', () => {
      this.kelvin = 5500; this.tint = 0;
      sK.value = 5500; sT.value = 0;
      this.draw(); notifyStateChange();
    });
  }

  // Get current white-point xy (Planckian + tint offset along v')
  private whitePointXY(): { x: number; y: number; uvOff: number } {
    const { x: xp, y: yp } = planckianXY(this.kelvin);
    // Tint shifts in u'v' along v' perpendicular (positive = magenta = below locus)
    const [up, vp] = xyToUv(xp, yp);
    const vpAdj = vp - (this.tint / 50) * 0.03; // ±0.03 v' max excursion
    // Convert back to xy
    const upAdj = up;
    const denom = 6 * upAdj - 16 * vpAdj + 12;
    const x = (9 * upAdj) / denom;
    const y = (4 * vpAdj) / denom;
    return { x, y, uvOff: (this.tint / 50) * 0.03 };
  }

  // Gain to apply: ratio of D65 white linear-RGB / current white linear-RGB
  private gain(): [number, number, number] {
    const { x, y } = this.whitePointXY();
    const cur = xyzToLin(xyzFromXY(x, y));
    const d65 = xyzToLin([0.95047, 1, 1.08883]);
    const g: [number, number, number] = [d65[0] / cur[0], d65[1] / cur[1], d65[2] / cur[2]];
    // normalise so green = 1
    return [g[0] / g[1], 1, g[2] / g[1]];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    // Layout: left half = chromaticity, right half = swatches
    const leftW = Math.min(560, w * 0.58);
    const M = 30;
    const px = M, py = M + 16;
    const pw = leftW - 2 * M, ph = h - py - M;

    // Plot u'v' axes: u' [0,0.62], v' [0,0.6]
    const uMin = 0.0, uMax = 0.62;
    const vMin = 0.0, vMax = 0.6;
    const X = (u: number) => px + ((u - uMin) / (uMax - uMin)) * pw;
    const Y = (v: number) => py + (1 - (v - vMin) / (vMax - vMin)) * ph;

    // Axes
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText("u'", px + pw / 2, py + ph + 18);
    g.save(); g.translate(px - 18, py + ph / 2); g.rotate(-Math.PI / 2);
    g.fillText("v'", 0, 0); g.restore();

    // Planckian locus 2000K..15000K
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let T = 1500; T <= 20000; T += 100) {
      const { x, y } = planckianXY(T);
      const [u, v] = xyToUv(x, y);
      const X0 = X(u), Y0 = Y(v);
      if (T === 1500) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();

    // Mark anchor K values
    g.fillStyle = theme.crimson; g.font = '10px serif';
    for (const T of [2500, 3500, 5000, 6500, 10000]) {
      const { x, y } = planckianXY(T);
      const [u, v] = xyToUv(x, y);
      g.beginPath(); g.arc(X(u), Y(v), 2, 0, Math.PI * 2); g.fill();
      g.fillText(`${T}K`, X(u) + 8, Y(v) - 4);
    }

    // Current white-point + tint excursion
    const { x: wx, y: wy } = this.whitePointXY();
    const [wu, wv] = xyToUv(wx, wy);
    // Reference point on locus
    const { x: lx, y: ly } = planckianXY(this.kelvin);
    const [lu, lv] = xyToUv(lx, ly);

    // Tint line from locus to current
    g.strokeStyle = theme.gold; g.lineWidth = 2; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(X(lu), Y(lv)); g.lineTo(X(wu), Y(wv)); g.stroke();
    g.setLineDash([]);

    // Marker
    g.fillStyle = theme.ink; g.beginPath(); g.arc(X(wu), Y(wv), 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.paperBg; g.lineWidth = 1.5; g.stroke();

    // Label
    g.fillStyle = theme.ink; g.textAlign = 'left'; g.font = '11px serif';
    g.fillText(`white-point: ${this.kelvin}K, tint ${this.tint > 0 ? '+' : ''}${this.tint}`, X(wu) + 8, Y(wv) + 4);

    // Right panel: scene chart, before / after gain
    const rightX = leftW + 12;
    const rightW = w - rightX - M;
    if (rightW > 100) {
      // 6×4 macbeth grid, 2 columns (raw / corrected)
      const cellH = (h - 80) / 8;
      const cellW = (rightW - 16) / 2;
      const macbeth: [number, number, number][] = [
        [115, 82, 68], [194, 150, 130], [98, 122, 157], [87, 108, 67], [133, 128, 177], [103, 189, 170],
        [243, 243, 242], [200, 200, 200], [160, 160, 160], [122, 122, 121], [85, 85, 85], [52, 52, 52],
      ];
      // Apply gain in sRGB encoded space (approximation but matches camera)
      const gn = this.gain();
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
      g.fillText('raw scene', rightX + cellW / 2, py + 12);
      g.fillText('after WB', rightX + cellW * 1.5 + 16, py + 12);
      for (let i = 0; i < 12; i++) {
        const cx = i % 3;
        const cy = Math.floor(i / 3);
        const [r, gg, b] = macbeth[i];
        // raw
        g.fillStyle = `rgb(${r},${gg},${b})`;
        g.fillRect(rightX + cx * (cellW / 3), py + 24 + cy * cellH, cellW / 3 - 2, cellH - 4);
        // corrected (gain in linear, simplistic)
        const rL = Math.pow(r / 255, 2.2), gL = Math.pow(gg / 255, 2.2), bL = Math.pow(b / 255, 2.2);
        const r2 = srgbEncode(rL * gn[0]) * 255;
        const g2 = srgbEncode(gL * gn[1]) * 255;
        const b2 = srgbEncode(bL * gn[2]) * 255;
        g.fillStyle = `rgb(${Math.round(r2)},${Math.round(g2)},${Math.round(b2)})`;
        g.fillRect(rightX + cellW + 16 + cx * (cellW / 3), py + 24 + cy * cellH, cellW / 3 - 2, cellH - 4);
      }

      // Gain readout
      const ry = py + 24 + 4 * cellH + 20;
      g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif'; g.textAlign = 'left';
      g.fillText(`gain  R×${gn[0].toFixed(2)}  G×${gn[1].toFixed(2)}  B×${gn[2].toFixed(2)}`, rightX, ry);
    }
  }
}

new KelvinTint();
