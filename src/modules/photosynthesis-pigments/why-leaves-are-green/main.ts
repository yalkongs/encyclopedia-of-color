import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Strat = 'naive' | 'real';
const STRATS: Strat[] = ['naive', 'real'];

function solar(l: number): number {
  // Rough AM1.5 visible — peak near 500 nm
  return Math.exp(-Math.pow((l - 500) / 130, 2));
}
function realPlant(l: number): number {
  return 0.85 * Math.exp(-Math.pow((l - 430) / 30, 2)) + 0.65 * Math.exp(-Math.pow((l - 662) / 30, 2));
}
function naivePlant(l: number): number {
  return 0.9 * Math.exp(-Math.pow((l - 540) / 80, 2));
}

class WhyGreen {
  private stage: CanvasStage;
  private strat: Strat = 'real';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('strat');
    if (raw && (STRATS as string[]).includes(raw)) this.strat = raw as Strat;
    const t = document.getElementById('strat') as EncToggle; t.value = this.strat;
    t.addEventListener('change', (e) => { this.strat = (e as CustomEvent).detail.value as Strat; this.draw(); notifyStateChange(); });
    registerStateParam('strat', () => this.strat);
    document.addEventListener('reset-params', () => { this.strat = 'real'; t.value = 'real'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`strategy: ${this.strat === 'naive' ? 'absorb the solar peak' : 'skip the peak (real plants)'}`, M, M);

    const sx = M, sy = M + 40, sw = w - 2 * M, sh = 240;
    for (let i = 0; i < sw; i++) {
      const l = 380 + (i / sw) * 320;
      g.fillStyle = wavelengthCss(l);
      g.fillRect(sx + i, sy, 1, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    const X = (l: number) => sx + ((l - 380) / 320) * sw;
    const Y = (v: number) => sy + (1 - v / 1.0) * sh;

    // Solar curve (gold)
    g.strokeStyle = '#d4a020'; g.lineWidth = 2;
    g.beginPath();
    for (let l = 380; l <= 700; l += 2) { const X0 = X(l), Y0 = Y(solar(l)); if (l === 380) g.moveTo(X0, Y0); else g.lineTo(X0, Y0); }
    g.stroke();
    // Plant absorption (red or grey)
    const plantFn = this.strat === 'naive' ? naivePlant : realPlant;
    g.strokeStyle = this.strat === 'naive' ? theme.crimson : '#1f7a4d'; g.lineWidth = 2;
    g.beginPath();
    for (let l = 380; l <= 700; l += 2) { const X0 = X(l), Y0 = Y(plantFn(l)); if (l === 380) g.moveTo(X0, Y0); else g.lineTo(X0, Y0); }
    g.stroke();

    // Captured ratio
    let cap = 0, total = 0;
    for (let l = 380; l <= 700; l += 5) { cap += solar(l) * plantFn(l); total += solar(l); }
    const eff = cap / total;

    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(`captured / total solar = ${(eff * 100).toFixed(1)}%`, sx + 10, sy + 20);
    g.fillStyle = theme.crimson; g.font = '11px serif';
    g.fillText(this.strat === 'naive' ? 'High capture — but reaction centres would saturate and damage' : 'Lower capture — but stable across day; redundant carotenoid antenna stores excess', sx + 10, sy + 38);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Plants evolved a strategy that *sacrifices* peak efficiency for protection — Marosvölgyi-van Gorkom argued this is why green wins evolutionarily.', M, h - M);
  }
}

new WhyGreen();
