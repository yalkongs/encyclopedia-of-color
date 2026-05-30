import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const W = 40, H = 26;
// CFA at (x,y) with RGGB tile: 0=R 1=G 2=B
function cfa(x: number, y: number): 0 | 1 | 2 {
  const o = (y % 2) * 2 + (x % 2);
  return (o === 0 ? 0 : o === 3 ? 2 : 1) as 0 | 1 | 2;
}
// hostile source: black/white diagonal stripe + colour swatch corner
function sourceRGB(x: number, y: number): [number, number, number] {
  // diagonal stripe (luminance edge): zone where x + y crosses a thick band
  const diag = (x + y) % 12;
  let r = 230, g = 230, b = 230;
  if (diag < 6) { r = 30; g = 30; b = 30; }
  // colour swatches in top-right (test red/green/blue edges)
  if (x >= W - 10 && y < 12) {
    const sx = x - (W - 10);
    if (sx < 5) { r = 230; g = 30; b = 30; }    // red
    else { r = 30; g = 200; b = 30; }            // green
  }
  // a sharp red-blue divider near bottom
  if (y >= H - 5) { r = x < W * 0.5 ? 230 : 30; g = 30; b = x < W * 0.5 ? 30 : 230; }
  return [r, g, b];
}

class BayerDemosaic {
  private stage: CanvasStage;
  private algo = 'bilinear';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.algo = hydrateFromUrl('algo') ?? 'bilinear';
    const t = document.getElementById('algo') as EncToggle;
    t.value = this.algo;
    t.addEventListener('change', (e) => { this.algo = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('algo', () => this.algo);
    document.addEventListener('reset-params', () => { this.algo = 'bilinear'; t.value = 'bilinear'; this.draw(); notifyStateChange(); });
  }

  // build the raw mosaic: at each pixel only its CFA channel carries the source value
  private buildRaw(): number[][] {
    const raw: number[][] = [];
    for (let y = 0; y < H; y++) {
      const row = new Array(W);
      for (let x = 0; x < W; x++) row[x] = sourceRGB(x, y)[cfa(x, y)];
      raw.push(row);
    }
    return raw;
  }

  private clamp(v: number, lo = 0, hi = 255): number { return Math.max(lo, Math.min(hi, v)); }

  // nearest-neighbour demosaic: for each pixel pull the missing channels from the closest neighbour of that colour
  private demosaicNearest(raw: number[][]): [number, number, number][][] {
    const out: [number, number, number][][] = [];
    const get = (x: number, y: number) => raw[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))];
    for (let y = 0; y < H; y++) {
      const row: [number, number, number][] = [];
      for (let x = 0; x < W; x++) {
        const c = cfa(x, y);
        const self = get(x, y);
        // search small neighbourhood for nearest of each missing colour
        let r = -1, g = -1, b = -1;
        if (c === 0) r = self; if (c === 1) g = self; if (c === 2) b = self;
        for (let d = 1; d < 4 && (r < 0 || g < 0 || b < 0); d++) {
          for (let dy = -d; dy <= d && (r < 0 || g < 0 || b < 0); dy++) {
            for (let dx = -d; dx <= d && (r < 0 || g < 0 || b < 0); dx++) {
              if (Math.abs(dx) !== d && Math.abs(dy) !== d) continue;
              const cc = cfa(x + dx, y + dy);
              const v = get(x + dx, y + dy);
              if (cc === 0 && r < 0) r = v; if (cc === 1 && g < 0) g = v; if (cc === 2 && b < 0) b = v;
            }
          }
        }
        row.push([this.clamp(r), this.clamp(g), this.clamp(b)]);
      }
      out.push(row);
    }
    return out;
  }

  // bilinear demosaic: per-pixel formulas from neighbouring CFA samples
  private demosaicBilinear(raw: number[][]): [number, number, number][][] {
    const get = (x: number, y: number) => raw[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(W - 1, x))];
    const out: [number, number, number][][] = [];
    for (let y = 0; y < H; y++) {
      const row: [number, number, number][] = [];
      for (let x = 0; x < W; x++) {
        const c = cfa(x, y);
        let r = 0, g = 0, b = 0;
        const self = get(x, y);
        if (c === 1) { // G site — neighbours: R and B on opposite axes depending on which G
          g = self;
          if (y % 2 === 0) { // R row (G is between R left/right and B above/below)
            r = (get(x - 1, y) + get(x + 1, y)) / 2;
            b = (get(x, y - 1) + get(x, y + 1)) / 2;
          } else {           // B row
            b = (get(x - 1, y) + get(x + 1, y)) / 2;
            r = (get(x, y - 1) + get(x, y + 1)) / 2;
          }
        } else if (c === 0) { // R site — G from 4 sides, B from 4 diagonals
          r = self;
          g = (get(x - 1, y) + get(x + 1, y) + get(x, y - 1) + get(x, y + 1)) / 4;
          b = (get(x - 1, y - 1) + get(x + 1, y - 1) + get(x - 1, y + 1) + get(x + 1, y + 1)) / 4;
        } else { // B site — G from 4 sides, R from 4 diagonals
          b = self;
          g = (get(x - 1, y) + get(x + 1, y) + get(x, y - 1) + get(x, y + 1)) / 4;
          r = (get(x - 1, y - 1) + get(x + 1, y - 1) + get(x - 1, y + 1) + get(x + 1, y + 1)) / 4;
        }
        row.push([this.clamp(r), this.clamp(g), this.clamp(b)]);
      }
      out.push(row);
    }
    return out;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#1a1714'; ctx.fillRect(0, 0, w, h);

    const pad = 30, gap = 18, pw = (w - pad * 2 - gap * 2) / 3, py = 70, ph = h - 160;
    const sx = Math.floor(pw / W), sy = Math.floor(ph / H);
    const cell = Math.min(sx, sy);

    const raw = this.buildRaw();
    const dem = this.algo === 'nearest' ? this.demosaicNearest(raw) : this.demosaicBilinear(raw);

    const drawPanel = (x0: number, label: string, render: (x: number, y: number) => [number, number, number]) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const [r, g, b] = render(x, y); ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x0 + x * cell, py + y * cell, cell + 0.5, cell + 0.5);
      }
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(x0, py, W * cell, H * cell);
      ctx.fillStyle = '#e6e3da'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, x0 + W * cell / 2, py - 12);
    };

    drawPanel(pad, 'source (truth)', (x, y) => sourceRGB(x, y));
    drawPanel(pad + pw + gap, 'raw Bayer mosaic', (x, y) => {
      const c = cfa(x, y), v = raw[y][x];
      return c === 0 ? [v, 0, 0] : c === 1 ? [0, v, 0] : [0, 0, v];
    });
    drawPanel(pad + (pw + gap) * 2, `demosaiced (${this.algo})`, (x, y) => dem[y][x]);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.algo === 'nearest'
      ? 'nearest — blocky colour patches along the diagonals where neighbours of the missing colour are far away'
      : 'bilinear — soft, but zipper colour fringes pop on the diagonal black/white edge as R, G, B interpolate at different rates', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new BayerDemosaic());
