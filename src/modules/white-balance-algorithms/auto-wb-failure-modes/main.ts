import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Cast multipliers in linear sRGB (R,G,B) for two common illuminants relative to D65.
// Tungsten 3000K: red-heavy. Daylight 5500K: near-neutral, slight cool relative to D65.
const CAST_DAY: [number, number, number] = [1.0, 1.0, 1.05];
const CAST_TUN: [number, number, number] = [1.5, 1.05, 0.55];

// Scene patches (reference sRGB 8-bit)
const PATCHES: [number, number, number, string][] = [
  [243, 243, 242, 'white'],
  [200, 200, 200, 'gray'],
  [122, 122, 121, 'mid-gray'],
  [115, 82, 68, 'skin'],
  [194, 150, 130, 'light skin'],
  [157, 188, 64, 'foliage'],
  [ 70, 148, 73, 'green'],
  [193, 90, 99, 'red'],
];

class AWBMixed {
  private stage: CanvasStage;
  private mix = 50; // daylight fraction percent

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mix = hydrateNumber('mix', 50);
    const s = document.getElementById('mix') as EncSlider;
    s.value = this.mix;
    s.addEventListener('input', (e) => { this.mix = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mix', () => Math.round(this.mix));
    document.addEventListener('reset-params', () => { this.mix = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private applyCast(rgb: [number, number, number], cast: [number, number, number]): [number, number, number] {
    return [
      Math.min(255, rgb[0] * cast[0]),
      Math.min(255, rgb[1] * cast[1]),
      Math.min(255, rgb[2] * cast[2]),
    ];
  }

  // Gray-world gain estimated from full scene (both halves weighted by area)
  private estimateGain(): [number, number, number] {
    let r = 0, gn = 0, b = 0, n = 0;
    const fDay = this.mix / 100;
    for (const [pr, pg, pb] of PATCHES) {
      // Each patch contributes once per half, weighted by area
      const day = this.applyCast([pr, pg, pb], CAST_DAY);
      const tun = this.applyCast([pr, pg, pb], CAST_TUN);
      r += day[0] * fDay + tun[0] * (1 - fDay);
      gn += day[1] * fDay + tun[1] * (1 - fDay);
      b += day[2] * fDay + tun[2] * (1 - fDay);
      n += 1;
    }
    r /= n; gn /= n; b /= n;
    const mid = (r + gn + b) / 3;
    return [mid / Math.max(1, r), mid / Math.max(1, gn), mid / Math.max(1, b)];
  }

  private applyGain(rgb: [number, number, number], g: [number, number, number]): [number, number, number] {
    return [
      Math.min(255, Math.round(rgb[0] * g[0])),
      Math.min(255, Math.round(rgb[1] * g[1])),
      Math.min(255, Math.round(rgb[2] * g[2])),
    ];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 36;
    const titleY = M + 14;
    const stripH = 96;
    const gap = 28;
    // Three rows: raw / chosen gain applied / annotation
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('captured scene: left half daylight 5500 K, right half tungsten 3000 K', M, titleY);

    const stripW = w - 2 * M;
    const splitX = M + stripW * (this.mix / 100);

    // Row 1: raw scene split
    const y1 = titleY + 10;
    this.drawScene(g, M, y1, splitX, y1 + stripH, CAST_DAY);
    this.drawScene(g, splitX, y1, M + stripW, y1 + stripH, CAST_TUN);
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(M, y1, stripW, stripH);
    g.beginPath(); g.moveTo(splitX, y1); g.lineTo(splitX, y1 + stripH); g.stroke();

    // Labels at top of each half
    g.fillStyle = theme.paperBg; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText(`daylight ${this.mix}%`, (M + splitX) / 2, y1 + 12);
    g.fillText(`tungsten ${100 - this.mix}%`, (splitX + M + stripW) / 2, y1 + 12);

    // Row 2: same scene after a single AWB gain applied uniformly
    const gain = this.estimateGain();
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`after AWB (one global gain  R×${gain[0].toFixed(2)}  G×${gain[1].toFixed(2)}  B×${gain[2].toFixed(2)})`, M, y1 + stripH + gap - 6);
    const y2 = y1 + stripH + gap + 8;
    this.drawSceneCorrected(g, M, y2, splitX, y2 + stripH, CAST_DAY, gain);
    this.drawSceneCorrected(g, splitX, y2, M + stripW, y2 + stripH, CAST_TUN, gain);
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(M, y2, stripW, stripH);
    g.beginPath(); g.moveTo(splitX, y2); g.lineTo(splitX, y2 + stripH); g.stroke();

    // Diagnostic readout: gray-patch residual cast per half
    const gray = PATCHES[1]; // (200,200,200)
    const dayG = this.applyGain(this.applyCast([gray[0], gray[1], gray[2]], CAST_DAY), gain);
    const tunG = this.applyGain(this.applyCast([gray[0], gray[1], gray[2]], CAST_TUN), gain);
    const dayErr = Math.sqrt((dayG[0] - gray[0]) ** 2 + (dayG[1] - gray[1]) ** 2 + (dayG[2] - gray[2]) ** 2);
    const tunErr = Math.sqrt((tunG[0] - gray[0]) ** 2 + (tunG[1] - gray[1]) ** 2 + (tunG[2] - gray[2]) ** 2);

    const ry = y2 + stripH + 30;
    g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('residual cast on the gray patch (RGB distance from neutral):', M, ry);
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText(`daylight half: ${dayErr.toFixed(1)}     tungsten half: ${tunErr.toFixed(1)}`, M, ry + 18);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    const winner = this.mix > 50 ? 'daylight (it dominates the average)' : this.mix < 50 ? 'tungsten (it dominates the average)' : 'a midpoint compromise (both halves stay slightly cast)';
    g.fillText(`AWB chose: ${winner} — the other half keeps its cast because one gain can only neutralise one illuminant.`, M, ry + 38);
  }

  private drawScene(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, cast: [number, number, number]) {
    const W = x1 - x0; const H = y1 - y0;
    const cols = 4, rows = 2; const cw = W / cols, ch = H / rows;
    for (let i = 0; i < 8; i++) {
      const cx = i % cols, cy = Math.floor(i / cols);
      const px = this.applyCast([PATCHES[i][0], PATCHES[i][1], PATCHES[i][2]], cast);
      g.fillStyle = `rgb(${Math.round(px[0])},${Math.round(px[1])},${Math.round(px[2])})`;
      g.fillRect(x0 + cx * cw + 2, y0 + cy * ch + 16, cw - 4, ch - 18);
    }
  }
  private drawSceneCorrected(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, cast: [number, number, number], gain: [number, number, number]) {
    const W = x1 - x0; const H = y1 - y0;
    const cols = 4, rows = 2; const cw = W / cols, ch = H / rows;
    for (let i = 0; i < 8; i++) {
      const cx = i % cols, cy = Math.floor(i / cols);
      const raw = this.applyCast([PATCHES[i][0], PATCHES[i][1], PATCHES[i][2]], cast);
      const px = this.applyGain(raw, gain);
      g.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
      g.fillRect(x0 + cx * cw + 2, y0 + cy * ch + 16, cw - 4, ch - 18);
    }
  }
}

new AWBMixed();
