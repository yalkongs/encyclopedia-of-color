import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const SWATCHES: Array<[string, [number, number, number]]> = [
  ['red', [0.85, 0.16, 0.16]],
  ['orange', [0.92, 0.55, 0.12]],
  ['yellow', [0.92, 0.86, 0.20]],
  ['green', [0.20, 0.68, 0.32]],
  ['cyan', [0.18, 0.72, 0.78]],
  ['blue', [0.20, 0.38, 0.85]],
  ['violet', [0.55, 0.28, 0.80]],
  ['rose', [0.88, 0.38, 0.62]],
];

const CONE_LO = -2.5, CONE_HI = 0.0; // log luminance: cone contribution ramp

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

class ScotopicColorLoss {
  private stage: CanvasStage;
  private logL = -1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.logL = hydrateNumber('logL', -1);
    (document.getElementById('logL') as EncSlider).value = this.logL;
    registerStateParam('logL', () => this.logL);
    (document.getElementById('logL') as EncSlider).addEventListener('input', (e) => {
      this.logL = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.logL = -1;
      (document.getElementById('logL') as EncSlider).value = -1;
      this.draw(); notifyStateChange();
    });
  }

  private adapted(rgb: [number, number, number], fCone: number, bright: number): string {
    const [r, g, b] = rgb;
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Rod percept: achromatic, Purkinje-shifted slightly blue.
    const rod: [number, number, number] = [Y * 0.82, Y * 0.92, Y * 1.18];
    const ch = (c: number, rc: number) => clamp01((rc + (c - rc) * fCone)) * bright;
    return `rgb(${Math.round(ch(r, rod[0]) * 255)},${Math.round(ch(g, rod[1]) * 255)},${Math.round(ch(b, rod[2]) * 255)})`;
  }

  private regime(): string {
    if (this.logL >= 0.5) return 'photopic — cones only';
    if (this.logL <= -2.5) return 'scotopic — rods only';
    return 'mesopic — cones fading';
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const fCone = clamp01((this.logL - CONE_LO) / (CONE_HI - CONE_LO));
    const bright = 0.32 + 0.68 * clamp01((this.logL + 3.5) / 5);

    // Dim backdrop reflecting overall scene brightness.
    const bg = Math.round(8 + bright * 26);
    ctx.fillStyle = `rgb(${bg},${bg},${Math.round(bg * 1.15)})`;
    ctx.fillRect(0, 0, w, h);

    // Swatch grid (2 rows × 4).
    const cols = 4, rows = 2;
    const gx = w * 0.08, gy = h * 0.12, gw = w * 0.84, gh = h * 0.58;
    const cellW = gw / cols, cellH = gh / rows;
    const pad = Math.min(cellW, cellH) * 0.12;

    SWATCHES.forEach((sw, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = gx + c * cellW + pad, y = gy + r * cellH + pad;
      const cw = cellW - pad * 2, ch = cellH - pad * 2;
      ctx.fillStyle = this.adapted(sw[1], fCone, bright);
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x, y, cw, ch);
    });

    // Cone-contribution meter.
    const mx = w * 0.08, my = gy + gh + 26, mw = w * 0.84, mh = 16;
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = theme.gold; ctx.fillRect(mx, my, fCone * mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);
    ctx.fillStyle = 'rgba(245,245,238,0.8)'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('cone contribution (colour)', mx, my - 6);

    // Readout.
    ctx.fillStyle = '#e8d9a0'; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(
      `L = ${Math.pow(10, this.logL).toExponential(1)} cd/m²    chroma ${(fCone * 100).toFixed(0)}%    ${this.regime()}`,
      mx, my + mh + 24,
    );
  }
}
window.addEventListener('DOMContentLoaded', () => new ScotopicColorLoss());
