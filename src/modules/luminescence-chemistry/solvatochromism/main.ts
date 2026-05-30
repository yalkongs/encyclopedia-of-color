import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Sol = 'hexane' | 'toluene' | 'chloroform' | 'acetone' | 'methanol' | 'water';
const SOLS: Sol[] = ['hexane', 'toluene', 'chloroform', 'acetone', 'methanol', 'water'];
// Reichardt's betaine λ_max measured per solvent + E_T(30) polarity (kcal/mol)
const INFO: Record<Sol, { ET30: number; lambda: number; rgb: [number, number, number] }> = {
  hexane:     { ET30: 31.0, lambda: 920, rgb: [40, 30, 30] },     // far IR — appears dark in flask
  toluene:    { ET30: 33.9, lambda: 845, rgb: [60, 30, 60] },
  chloroform: { ET30: 39.1, lambda: 770, rgb: [80, 30, 90] },
  acetone:    { ET30: 42.2, lambda: 680, rgb: [120, 30, 100] },
  methanol:   { ET30: 55.4, lambda: 515, rgb: [100, 130, 30] },
  water:      { ET30: 63.1, lambda: 460, rgb: [60, 110, 130] },
};


class Solvatochrom {
  private stage: CanvasStage;
  private sol: Sol = 'acetone';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('sol');
    if (raw && (SOLS as string[]).includes(raw)) this.sol = raw as Sol;
    const t = document.getElementById('sol') as EncToggle; t.value = this.sol;
    t.addEventListener('change', (e) => { this.sol = (e as CustomEvent).detail.value as Sol; this.draw(); notifyStateChange(); });
    registerStateParam('sol', () => this.sol);
    document.addEventListener('reset-params', () => { this.sol = 'acetone'; t.value = 'acetone'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.sol];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Reichardt's betaine in ${this.sol} · λ_max = ${i.lambda} nm · E_T(30) = ${i.ET30} kcal/mol`, M, M);

    // Solvent comparison: 6 flask swatches
    const sy = M + 50;
    const sw = (w - 7 * M) / 6;
    const sh = 140;
    let cx = M;
    for (const s of SOLS) {
      const info2 = INFO[s];
      g.fillStyle = `rgb(${info2.rgb[0]},${info2.rgb[1]},${info2.rgb[2]})`;
      g.fillRect(cx, sy, sw, sh);
      g.strokeStyle = s === this.sol ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = s === this.sol ? 2.5 : 1;
      g.strokeRect(cx, sy, sw, sh);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(s, cx + sw / 2, sy + sh + 14);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px monospace';
      g.fillText(`${info2.lambda} nm`, cx + sw / 2, sy + sh + 28);
      cx += sw + M;
    }

    // Spectrum strip with E_T(30) axis
    const by = sy + sh + 60;
    const bx = M, bw = w - 2 * M, bh = 50;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('λ_max position on visible spectrum', bx, by - 6);
    for (let p = 0; p < bw; p++) {
      const lam = 380 + (p / bw) * 600;
      g.fillStyle = lam > 780 ? `rgba(50,30,50,${0.4 + 0.6 * (lam - 780) / 200})` : wavelengthCss(lam);
      g.fillRect(bx + p, by, 1, bh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, bw, bh);
    // Markers
    for (const s of SOLS) {
      const lam = INFO[s].lambda;
      const X = bx + Math.min(1, (lam - 380) / 600) * bw;
      g.strokeStyle = s === this.sol ? theme.crimson : theme.inkAlpha(0.55);
      g.lineWidth = s === this.sol ? 2.5 : 1;
      g.beginPath(); g.moveTo(X, by); g.lineTo(X, by + bh); g.stroke();
    }
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    for (const lam of [400, 500, 600, 700, 800, 900]) {
      const X = bx + ((lam - 380) / 600) * bw;
      g.fillText(`${lam}`, X, by + bh + 14);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Reichardt\'s betaine (1969) is the standard solvent-polarity probe — the wider the λ_max range, the better as a polarity scale.', M, h - M);
  }
}

new Solvatochrom();
