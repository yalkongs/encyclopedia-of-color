import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Obj = 'red-apple' | 'green-leaf' | 'white-paper' | 'red-glass' | 'clear-glass';
const OBJS: Obj[] = ['red-apple', 'green-leaf', 'white-paper', 'red-glass', 'clear-glass'];

// Returns A/R/T fractions per wavelength
function ART(obj: Obj, lam: number): { A: number; R: number; T: number } {
  switch (obj) {
    case 'red-apple': return { A: lam < 580 ? 0.85 : 0.05, R: lam < 580 ? 0.15 : 0.95, T: 0 };
    case 'green-leaf': {
      // Chlorophyll absorbs blue 430 and red 660
      const A = 0.7 * Math.exp(-Math.pow((lam - 430) / 40, 2)) + 0.7 * Math.exp(-Math.pow((lam - 660) / 50, 2));
      return { A: Math.min(0.95, A), R: 1 - Math.min(0.95, A), T: 0 };
    }
    case 'white-paper': return { A: 0.05, R: 0.95, T: 0 };
    case 'red-glass': return { A: lam < 580 ? 0.85 : 0.05, R: 0.05, T: lam < 580 ? 0.10 : 0.90 };
    case 'clear-glass': return { A: 0.02, R: 0.04, T: 0.94 };
  }
}

function integrateColour(spec: (lam: number) => number): [number, number, number] {
  let r = 0, gn = 0, b = 0, n = 0;
  for (let l = 380; l <= 700; l += 5) {
    const f = spec(l);
    const css = wavelengthCss(l);
    const m = css.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
    r += +m[1] * f; gn += +m[2] * f; b += +m[3] * f; n++;
  }
  return [Math.min(255, r / n), Math.min(255, gn / n), Math.min(255, b / n)];
}

class WhyColour {
  private stage: CanvasStage;
  private obj: Obj = 'red-apple';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('obj');
    if (raw && (OBJS as string[]).includes(raw)) this.obj = raw as Obj;
    const t = document.getElementById('obj') as EncToggle; t.value = this.obj;
    t.addEventListener('change', (e) => { this.obj = (e as CustomEvent).detail.value as Obj; this.draw(); notifyStateChange(); });
    registerStateParam('obj', () => this.obj);
    document.addEventListener('reset-params', () => { this.obj = 'red-apple'; t.value = 'red-apple'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`object: ${this.obj}`, M, M);

    // Three spectra rows: A, R, T
    const rowH = 50;
    const py = M + 30, pw = w - 2 * M;
    const labels = ['absorbed (→ heat)', 'reflected (opaque colour)', 'transmitted (transparent colour)'];
    const keys: ('A' | 'R' | 'T')[] = ['A', 'R', 'T'];
    for (let row = 0; row < 3; row++) {
      const ry = py + row * (rowH + 30);
      g.fillStyle = theme.ink; g.font = '12px serif';
      g.fillText(labels[row], M, ry - 4);
      for (let i = 0; i < pw; i++) {
        const lam = 380 + (i / pw) * 320;
        const arts = ART(this.obj, lam);
        const v = arts[keys[row]];
        const base = wavelengthCss(lam);
        const m = base.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
        const r = +m[1] * v, gv = +m[2] * v, b = +m[3] * v;
        if (row === 0) {
          // Absorbed shown as dark band
          g.fillStyle = `rgb(${Math.round(20 + 30 * (1 - v))},${Math.round(20 + 30 * (1 - v))},${Math.round(20 + 30 * (1 - v))})`;
        } else {
          g.fillStyle = `rgb(${Math.round(r)},${Math.round(gv)},${Math.round(b)})`;
        }
        g.fillRect(M + i, ry, 1, rowH);
      }
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, ry, pw, rowH);
    }
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    for (const lam of [400, 500, 600, 700]) {
      const X = M + ((lam - 380) / 320) * pw;
      g.fillText(`${lam}`, X, py + 3 * (rowH + 30) + 4);
    }

    // Perceived colour swatches
    const sy = py + 3 * (rowH + 30) + 30;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('perceived colour:', M, sy);
    // For opaque: reflection × ambient. For transparent: transmission × ambient
    const isTransparent = this.obj === 'clear-glass' || this.obj === 'red-glass';
    const colourR = integrateColour((lam) => ART(this.obj, lam).R);
    const colourT = integrateColour((lam) => ART(this.obj, lam).T);
    const finalC = isTransparent ? colourT : colourR;
    g.fillStyle = `rgb(${Math.round(finalC[0])},${Math.round(finalC[1])},${Math.round(finalC[2])})`;
    g.fillRect(M + 160, sy - 16, 120, 26);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 160, sy - 16, 120, 26);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(isTransparent ? '(seen by transmission)' : '(seen by reflection)', M + 290, sy);
  }
}

new WhyColour();
