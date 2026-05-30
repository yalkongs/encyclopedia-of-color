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
import { wavelengthCss } from '@core/render/molecular';

type Pair = 'red-blue' | 'blue-yellow' | 'white-black';
const PAIRS: Pair[] = ['red-blue', 'blue-yellow', 'white-black'];

type PigSpec = (lam: number) => { k: number; s: number };

const PIGMENTS: Record<string, PigSpec> = {
  red: (l) => ({ k: l < 550 ? 4 * Math.exp(-Math.pow((l - 450) / 60, 2)) + 0.5 : 0.05, s: 1.5 }),
  blue: (l) => ({ k: l > 530 ? 4 * Math.exp(-Math.pow((l - 620) / 80, 2)) + 0.4 : 0.2, s: 1.0 }),
  yellow: (l) => ({ k: l < 470 ? 3.5 * Math.exp(-Math.pow((l - 430) / 50, 2)) + 0.4 : 0.05, s: 1.6 }),
  white: () => ({ k: 0.005, s: 4.0 }),
  black: () => ({ k: 5.0, s: 0.05 }),
};

const PAIR_KEYS: Record<Pair, [string, string]> = {
  'red-blue': ['red', 'blue'],
  'blue-yellow': ['blue', 'yellow'],
  'white-black': ['white', 'black'],
};

function reflectance(k: number, s: number): number {
  const ks = k / Math.max(0.001, s);
  return 1 + ks - Math.sqrt(ks * (ks + 2));
}

function spectrumToRGB(spec: (l: number) => number): [number, number, number] {
  let r = 0, gn = 0, b = 0, n = 0;
  for (let l = 380; l <= 700; l += 5) {
    const R = spec(l);
    const css = wavelengthCss(l);
    const m = css.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
    r += +m[1] * R; gn += +m[2] * R; b += +m[3] * R; n++;
  }
  return [r / n, gn / n, b / n];
}

class KMMixer {
  private stage: CanvasStage;
  private x = 50;
  private pair: Pair = 'red-blue';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.x = hydrateNumber('x', 50);
    const raw = hydrateFromUrl('pair');
    if (raw && (PAIRS as string[]).includes(raw)) this.pair = raw as Pair;
    const sX = document.getElementById('x') as EncSlider; sX.value = this.x;
    sX.addEventListener('input', (e) => { this.x = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tP = document.getElementById('pair') as EncToggle; tP.value = this.pair;
    tP.addEventListener('change', (e) => { this.pair = (e as CustomEvent).detail.value as Pair; this.draw(); notifyStateChange(); });
    registerStateParam('x', () => Math.round(this.x));
    registerStateParam('pair', () => this.pair);
    document.addEventListener('reset-params', () => { this.x = 50; this.pair = 'red-blue'; sX.value = 50; tP.value = 'red-blue'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const x2 = this.x / 100;
    const x1 = 1 - x2;
    const [p1Key, p2Key] = PAIR_KEYS[this.pair];
    const p1 = PIGMENTS[p1Key], p2 = PIGMENTS[p2Key];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${p1Key} (${(x1 * 100).toFixed(0)}%) + ${p2Key} (${(x2 * 100).toFixed(0)}%)`, M, M);

    // K-M mix
    const kmSpec = (l: number) => {
      const v1 = p1(l), v2 = p2(l);
      const K = x1 * v1.k + x2 * v2.k;
      const S = x1 * v1.s + x2 * v2.s;
      return reflectance(K, S);
    };
    const kmColour = spectrumToRGB(kmSpec);
    // Naive RGB mix: just compute end-RGBs and average
    const c1 = spectrumToRGB((l) => reflectance(p1(l).k, p1(l).s));
    const c2 = spectrumToRGB((l) => reflectance(p2(l).k, p2(l).s));
    const naive: [number, number, number] = [c1[0] * x1 + c2[0] * x2, c1[1] * x1 + c2[1] * x2, c1[2] * x1 + c2[2] * x2];

    // Layout: 4 swatches across (p1 / KM / naive / p2) with slider marker
    const sy = M + 50;
    const sh = 180;
    const sw = (w - 5 * M) / 4;
    const swatches: [string, [number, number, number]][] = [
      [`${p1Key} (100%)`, c1],
      [`K-M mix (correct)`, kmColour],
      [`naive RGB avg`, naive],
      [`${p2Key} (100%)`, c2],
    ];
    let cx = M;
    for (const [label, col] of swatches) {
      g.fillStyle = `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`;
      g.fillRect(cx, sy, sw, sh);
      g.strokeStyle = label.includes('K-M') ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = label.includes('K-M') ? 2.5 : 1;
      g.strokeRect(cx, sy, sw, sh);
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
      g.fillText(label, cx + sw / 2, sy + sh + 16);
      cx += sw + M;
    }

    // Reflectance spectra below
    const py = sy + sh + 40, pw = w - 2 * M, ph = 100;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('R∞(λ) — K-M (red) vs naive RGB-mix sampled (grey)', M + pw / 2, py - 6);
    const X = (l: number) => M + ((l - 400) / 300) * pw;
    const Y = (v: number) => py + (1 - v) * ph;
    // KM spectrum
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let l = 400; l <= 700; l += 2) {
      const X0 = X(l), Y0 = Y(kmSpec(l));
      if (l === 400) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    // Naive spectrum: linear interpolation of two end-spectra (NOT what KM does)
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2; g.setLineDash([3, 3]);
    g.beginPath();
    for (let l = 400; l <= 700; l += 2) {
      const R1 = reflectance(p1(l).k, p1(l).s);
      const R2 = reflectance(p2(l).k, p2(l).s);
      const Rmix = R1 * x1 + R2 * x2;
      const X0 = X(l), Y0 = Y(Rmix);
      if (l === 400) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) g.fillText(`${l}`, X(l), py + ph + 14);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('K-M handles the *non-linear* interaction of absorption and scattering — that\'s why digital painting software needs spectral data for realistic pigment mixing.', M, h - M);
  }
}

new KMMixer();
