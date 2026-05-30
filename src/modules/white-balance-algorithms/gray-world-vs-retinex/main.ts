import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

// Macbeth ColorChecker — sRGB 8-bit under D65 (Pascale 2006 / public values)
const MACBETH: [number, number, number][] = [
  [115, 82, 68],  [194, 150, 130],[ 98, 122, 157],[ 87, 108, 67], [133, 128, 177],[103, 189, 170],
  [214, 126, 44], [ 80,  91, 166],[193,  90, 99], [ 94,  60, 108],[157, 188, 64], [224, 163, 46],
  [ 56,  61, 150],[ 70, 148, 73], [175,  54, 60], [231, 199, 31], [187,  86, 149],[  8, 133, 161],
  [243, 243, 242],[200, 200, 200],[160, 160, 160],[122, 122, 121],[ 85,  85,  85],[ 52,  52,  52],
];

type Algo = 'gray-world' | 'max-rgb' | 'retinex';
const ALGOS: Algo[] = ['gray-world', 'max-rgb', 'retinex'];

// Warm cast applied to scene (~3200 K equivalent, in linear gain space)
const CAST: [number, number, number] = [1.45, 1.0, 0.55];

class WBCompare {
  private stage: CanvasStage;
  private cloth = 0;       // 0..80 percent
  private hue = 20;        // 0..360
  private algo: Algo = 'gray-world';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.cloth = hydrateNumber('cloth', 0);
    this.hue = hydrateNumber('hue', 20);
    const raw = hydrateFromUrl('algo');
    if (raw && (ALGOS as string[]).includes(raw)) this.algo = raw as Algo;

    const sCloth = document.getElementById('cloth') as EncSlider;
    sCloth.value = this.cloth;
    sCloth.addEventListener('input', (e) => { this.cloth = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    const sHue = document.getElementById('hue') as EncSlider;
    sHue.value = this.hue;
    sHue.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    const tAlgo = document.getElementById('algo') as EncToggle;
    tAlgo.value = this.algo;
    tAlgo.addEventListener('change', (e) => { this.algo = (e as CustomEvent).detail.value as Algo; this.draw(); notifyStateChange(); });

    registerStateParam('cloth', () => Math.round(this.cloth));
    registerStateParam('hue', () => Math.round(this.hue));
    registerStateParam('algo', () => this.algo);

    document.addEventListener('reset-params', () => {
      this.cloth = 0; this.hue = 20; this.algo = 'gray-world';
      sCloth.value = 0; sHue.value = 20; tAlgo.value = 'gray-world';
      this.draw(); notifyStateChange();
    });
  }

  // Convert hue (deg) at fixed saturation/value to sRGB 8-bit
  private hueRGB(h: number, s = 0.9, v = 0.85): [number, number, number] {
    const c = v * s;
    const hp = (h % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (hp < 3) [r1, g1, b1] = [0, c, x];
    else if (hp < 4) [r1, g1, b1] = [0, x, c];
    else if (hp < 5) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const m = v - c;
    return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
  }

  // Build scene pixel list with cast + optional cloth
  private buildScene(): { pixels: [number, number, number][]; chartIdx: Set<number> } {
    const pixels: [number, number, number][] = [];
    const chartIdx = new Set<number>();
    // 24 patches, each contributes nPatch pixels
    const nPatch = 100;
    for (let i = 0; i < 24; i++) {
      const [r, g, b] = MACBETH[i];
      for (let k = 0; k < nPatch; k++) {
        chartIdx.add(pixels.length);
        pixels.push([
          Math.min(255, r * CAST[0]),
          Math.min(255, g * CAST[1]),
          Math.min(255, b * CAST[2]),
        ]);
      }
    }
    // cloth pixels (large dominant area, also under cast)
    const totalSceneArea = 2400 / (1 - this.cloth / 100) - 2400; // cloth fraction of total
    const nCloth = Math.max(0, Math.round(totalSceneArea));
    const [cr, cg, cb] = this.hueRGB(this.hue);
    for (let k = 0; k < nCloth; k++) {
      pixels.push([
        Math.min(255, cr * CAST[0]),
        Math.min(255, cg * CAST[1]),
        Math.min(255, cb * CAST[2]),
      ]);
    }
    return { pixels, chartIdx };
  }

  // Compute gains per algorithm
  private estimateGain(pixels: [number, number, number][]): [number, number, number] {
    if (this.algo === 'gray-world') {
      let r = 0, g = 0, b = 0;
      for (const p of pixels) { r += p[0]; g += p[1]; b += p[2]; }
      r /= pixels.length; g /= pixels.length; b /= pixels.length;
      const mid = (r + g + b) / 3;
      return [mid / Math.max(1, r), mid / Math.max(1, g), mid / Math.max(1, b)];
    }
    if (this.algo === 'max-rgb') {
      let r = 1, g = 1, b = 1;
      for (const p of pixels) { if (p[0] > r) r = p[0]; if (p[1] > g) g = p[1]; if (p[2] > b) b = p[2]; }
      const mx = Math.max(r, g, b);
      return [mx / r, mx / g, mx / b];
    }
    // retinex (single-scale white patch): 99th percentile per channel as illuminant
    const sortc = [0, 1, 2].map((c) => pixels.map((p) => p[c]).sort((a, b) => a - b));
    const pct = (arr: number[], q: number) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];
    const r = Math.max(1, pct(sortc[0], 0.99));
    const g = Math.max(1, pct(sortc[1], 0.99));
    const b = Math.max(1, pct(sortc[2], 0.99));
    const mx = Math.max(r, g, b);
    return [mx / r, mx / g, mx / b];
  }

  private applyGain(rgb: [number, number, number], gain: [number, number, number]): [number, number, number] {
    return [
      Math.min(255, Math.round(rgb[0] * gain[0])),
      Math.min(255, Math.round(rgb[1] * gain[1])),
      Math.min(255, Math.round(rgb[2] * gain[2])),
    ];
  }

  private deltaRGB(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  }

  // Mean RGB error on 6 grayscale patches (idx 18..23) — gray patches should be neutral
  private grayError(corrected: [number, number, number][]): number {
    let err = 0;
    for (let i = 18; i < 24; i++) {
      const start = i * 100;
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < 100; k++) { r += corrected[start + k][0]; g += corrected[start + k][1]; b += corrected[start + k][2]; }
      r /= 100; g /= 100; b /= 100;
      const target = MACBETH[i];
      err += this.deltaRGB([r, g, b], target);
    }
    return err / 6;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    // Build scene + estimate
    const { pixels } = this.buildScene();
    const gain = this.estimateGain(pixels);
    const corrected = pixels.map((p) => this.applyGain(p, gain));

    // Layout: top half scene strip + cloth, bottom half = chart cast / chart corrected
    const M = 40;
    const labelH = 26;
    const stripH = 110;
    const stripY = M + labelH + 4;

    // Top: original scene (chart + cloth) as composite swatch grid
    g.fillStyle = theme.ink; g.font = '13px serif';
    g.textAlign = 'left';
    g.fillText('captured scene (warm cast applied)', M, M + 16);

    // Chart strip = 6×4 grid for 24 patches
    const chartW = Math.min(540, w - 2 * M - 180); // reserve cloth area
    const cellW = chartW / 6;
    const cellH = stripH / 4;
    for (let i = 0; i < 24; i++) {
      const cx = i % 6;
      const cy = Math.floor(i / 6);
      let r = 0, gn = 0, b = 0;
      for (let k = 0; k < 100; k++) { r += pixels[i * 100 + k][0]; gn += pixels[i * 100 + k][1]; b += pixels[i * 100 + k][2]; }
      r /= 100; gn /= 100; b /= 100;
      g.fillStyle = `rgb(${Math.round(r)},${Math.round(gn)},${Math.round(b)})`;
      g.fillRect(M + cx * cellW, stripY + cy * cellH, cellW - 2, cellH - 2);
    }

    // Cloth area to the right
    const clothX = M + chartW + 16;
    const clothW = w - clothX - M;
    if (this.cloth > 0) {
      const castCloth = [
        Math.min(255, this.hueRGB(this.hue)[0] * CAST[0]),
        Math.min(255, this.hueRGB(this.hue)[1] * CAST[1]),
        Math.min(255, this.hueRGB(this.hue)[2] * CAST[2]),
      ];
      g.fillStyle = `rgb(${Math.round(castCloth[0])},${Math.round(castCloth[1])},${Math.round(castCloth[2])})`;
      g.fillRect(clothX, stripY, clothW, stripH);
      g.fillStyle = theme.paperBg; g.font = '11px serif';
      g.fillText(`${this.cloth}% cloth`, clothX + 8, stripY + stripH - 8);
    } else {
      g.strokeStyle = theme.inkAlpha(0.3);
      g.setLineDash([4, 4]);
      g.strokeRect(clothX, stripY, clothW, stripH);
      g.setLineDash([]);
      g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif';
      g.fillText('(no dominant cloth)', clothX + 8, stripY + 18);
    }

    // Bottom panel: corrected chart vs reference (no cast)
    const botY = stripY + stripH + 50;
    g.fillStyle = theme.ink; g.font = '13px serif';
    g.fillText(`white-balanced by: ${this.algo}`, M, botY - 12);
    g.fillText('reference (D65 truth)', M + chartW + 16, botY - 12);

    // Corrected chart
    for (let i = 0; i < 24; i++) {
      const cx = i % 6;
      const cy = Math.floor(i / 6);
      let r = 0, gn = 0, b = 0;
      for (let k = 0; k < 100; k++) { r += corrected[i * 100 + k][0]; gn += corrected[i * 100 + k][1]; b += corrected[i * 100 + k][2]; }
      r /= 100; gn /= 100; b /= 100;
      g.fillStyle = `rgb(${Math.round(r)},${Math.round(gn)},${Math.round(b)})`;
      g.fillRect(M + cx * cellW, botY + cy * cellH, cellW - 2, cellH - 2);
    }
    // Reference chart (right) - half size
    const refW = clothW;
    const refCell = refW / 6;
    for (let i = 0; i < 24; i++) {
      const cx = i % 6;
      const cy = Math.floor(i / 6);
      const [r, gn, b] = MACBETH[i];
      g.fillStyle = `rgb(${r},${gn},${b})`;
      g.fillRect(clothX + cx * refCell, botY + cy * (stripH / 4), refCell - 2, stripH / 4 - 2);
    }

    // Readout
    const err = this.grayError(corrected);
    const readoutY = botY + stripH + 30;
    g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`mean gray-patch error (RGB distance): ${err.toFixed(1)}`, M, readoutY);
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    const gainText = `est gain  R×${gain[0].toFixed(2)}  G×${gain[1].toFixed(2)}  B×${gain[2].toFixed(2)}`;
    g.fillText(gainText, M, readoutY + 18);
    g.fillStyle = theme.inkAlpha(0.65);
    if (this.cloth > 30 && this.algo === 'gray-world') {
      g.fillText('gray-world fails: scene mean is pulled toward the cloth, neutral patches now drift toward the complementary hue', M, readoutY + 38);
    } else if (this.cloth > 50 && this.algo === 'max-rgb') {
      g.fillText('max-rgb biased by saturated cloth: brightest pixel sits in one channel of the cloth, not the illuminant', M, readoutY + 38);
    }
  }
}

new WBCompare();
