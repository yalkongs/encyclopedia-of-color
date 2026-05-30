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

type Stock = 'negative' | 'positive';
const STOCKS: Stock[] = ['negative', 'positive'];

// Returns density for given logE (log10 exposure relative to some baseline)
function densityCurve(logE: number, gamma: number, stock: Stock): number {
  // Stock parameters
  const dMin = stock === 'negative' ? 0.25 : 0.15;
  const dMax = stock === 'negative' ? 2.6 : 3.6;
  const toeStart = stock === 'negative' ? -2.5 : -1.5;
  const straightStart = stock === 'negative' ? -1.8 : -1.1;
  const shoulderStart = stock === 'negative' ? 0.5 : 0.3;
  const shoulderWidth = stock === 'negative' ? 1.2 : 0.6;

  // Toe (smooth roll-up from dMin)
  if (logE < toeStart) return dMin;
  if (logE < straightStart) {
    const t = (logE - toeStart) / (straightStart - toeStart);
    const smooth = t * t * (3 - 2 * t);
    return dMin + smooth * (gamma * (straightStart - toeStart) * 0.5);
  }
  // Straight portion
  const baseAtStraight = dMin + gamma * (straightStart - toeStart) * 0.5;
  if (logE < shoulderStart) {
    return baseAtStraight + gamma * (logE - straightStart);
  }
  // Shoulder
  const baseAtShoulder = baseAtStraight + gamma * (shoulderStart - straightStart);
  const t = Math.min(1, (logE - shoulderStart) / shoulderWidth);
  const smooth = t * t * (3 - 2 * t);
  return Math.min(dMax, baseAtShoulder + smooth * (dMax - baseAtShoulder));
}

class HDCurve {
  private stage: CanvasStage;
  private gammaPct = 65; // gamma * 100
  private stock: Stock = 'negative';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.gammaPct = hydrateNumber('gamma', 65);
    const raw = hydrateFromUrl('stock');
    if (raw && (STOCKS as string[]).includes(raw)) this.stock = raw as Stock;

    const sG = document.getElementById('gamma') as EncSlider;
    sG.value = this.gammaPct;
    sG.addEventListener('input', (e) => { this.gammaPct = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    const tS = document.getElementById('stock') as EncToggle;
    tS.value = this.stock;
    tS.addEventListener('change', (e) => { this.stock = (e as CustomEvent).detail.value as Stock; this.draw(); notifyStateChange(); });

    registerStateParam('gamma', () => Math.round(this.gammaPct));
    registerStateParam('stock', () => this.stock);

    document.addEventListener('reset-params', () => {
      this.gammaPct = 65; this.stock = 'negative';
      sG.value = 65; tS.value = 'negative';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 60;
    const px = M, py = M, pw = w - 2 * M, ph = h - 2 * M - 30;

    const xMin = -3.5, xMax = 1.5;
    const yMin = 0, yMax = 4;
    const X = (logE: number) => px + ((logE - xMin) / (xMax - xMin)) * pw;
    const Y = (d: number) => py + (1 - (d - yMin) / (yMax - yMin)) * ph;

    // Axes
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    for (let x = -3; x <= 1; x++) {
      g.beginPath(); g.moveTo(X(x), py + ph); g.lineTo(X(x), py + ph + 4); g.stroke();
      g.fillText(`${x}`, X(x), py + ph + 18);
    }
    g.textAlign = 'right';
    for (let y = 0; y <= 4; y += 0.5) {
      g.beginPath(); g.moveTo(px - 4, Y(y)); g.lineTo(px, Y(y)); g.stroke();
      g.fillText(y.toFixed(1), px - 8, Y(y) + 4);
    }
    g.textAlign = 'center'; g.fillText('log₁₀ exposure (relative)', px + pw / 2, py + ph + 38);
    g.save(); g.translate(px - 36, py + ph / 2); g.rotate(-Math.PI / 2);
    g.fillText('density D', 0, 0); g.restore();

    // 3 curves per stock (slightly offset for R/G/B layers in negative)
    const colours: [string, number][] = this.stock === 'negative'
      ? [['#a3132d', 0.0], ['#1f7a4d', -0.05], ['#1f567a', -0.10]]
      : [['#a3132d', 0.0], ['#1f7a4d', 0.0], ['#1f567a', 0.0]];

    const gamma = this.gammaPct / 100;
    for (const [col, offset] of colours) {
      g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath();
      let first = true;
      for (let logE = xMin; logE <= xMax; logE += 0.02) {
        const d = densityCurve(logE - offset, gamma, this.stock);
        const X0 = X(logE), Y0 = Y(d);
        if (first) { g.moveTo(X0, Y0); first = false; } else g.lineTo(X0, Y0);
      }
      g.stroke();
    }

    // Labels for stages
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
    const labelY = py + 12;
    g.fillText(`${this.stock === 'negative' ? 'Colour Negative' : 'Slide / Reversal'} · γ ≈ ${gamma.toFixed(2)}`, px + 12, labelY);

    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif';
    g.fillText('toe (shadows)', X(-2.2), Y(0.35));
    g.fillText('straight portion', X(-0.5), Y(2.0));
    g.fillText('shoulder (highlights)', X(0.9), Y(3.0));

    // Legend
    const lx = px + 12, ly = py + 32;
    if (this.stock === 'negative') {
      g.fillStyle = '#1f567a'; g.fillRect(lx, ly, 14, 4); g.fillStyle = theme.ink; g.font = '10px serif'; g.fillText('B layer (offset)', lx + 20, ly + 4);
      g.fillStyle = '#1f7a4d'; g.fillRect(lx, ly + 14, 14, 4); g.fillStyle = theme.ink; g.fillText('G layer', lx + 20, ly + 18);
      g.fillStyle = '#a3132d'; g.fillRect(lx, ly + 28, 14, 4); g.fillStyle = theme.ink; g.fillText('R layer', lx + 20, ly + 32);
    }

    // Annotation below
    const ny = py + ph + 56;
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    const note = this.stock === 'negative'
      ? 'Negative film has a long toe and soft shoulder — wide latitude, gentle highlight roll-off. Three RGB layers are slightly offset so each colour records its own density.'
      : 'Slide/positive film has a steeper γ and short shoulder — narrow latitude, vivid colour. Get exposure wrong by a stop and you lose detail.';
    g.fillText(note, M, ny);
  }
}

new HDCurve();
