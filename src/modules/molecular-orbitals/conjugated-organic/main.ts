import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawPolyene, wavelengthCss } from '@core/render/molecular';

// Empirical (Lewis-Calvin / Woodward) — polyene λ_max grows roughly with N
// We use a saturating curve: λ_max(N) ≈ 220 + 60·(N − 1) − 1.5·(N − 1)² for N ≤ 12
function lambdaMaxNm(N: number): number {
  return 220 + 60 * (N - 1) - 1.5 * Math.pow(N - 1, 2);
}

function complementCss(absLambda: number): string {
  const offsetTable: [number, number][] = [
    [400, 580], [430, 600], [450, 580], [490, 620], [520, 640], [550, 410], [580, 450], [610, 480], [640, 490], [700, 510],
  ];
  for (let i = 0; i < offsetTable.length - 1; i++) {
    const [l0, c0] = offsetTable[i], [l1, c1] = offsetTable[i + 1];
    if (absLambda >= l0 && absLambda <= l1) {
      const t = (absLambda - l0) / (l1 - l0);
      return wavelengthCss(c0 + t * (c1 - c0));
    }
  }
  return absLambda < 400 ? '#e8e6e0' : wavelengthCss(550);
}

class Conjugated {
  private stage: CanvasStage;
  private N = 11;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.N = hydrateNumber('N', 11);
    const s = document.getElementById('N') as EncSlider; s.value = this.N;
    s.addEventListener('input', (e) => { this.N = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('N', () => Math.round(this.N));
    document.addEventListener('reset-params', () => { this.N = 11; s.value = 11; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lambda = lambdaMaxNm(this.N);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`N = ${this.N} conjugated double bonds · λ_max ≈ ${lambda.toFixed(0)} nm`, M, M);

    // Chain drawing centred horizontally
    const chainY = M + 80;
    const step = Math.min(22, (w - 2 * M - 40) / (2 * this.N + 1));
    const totalLength = this.N * 2 * step;
    const cx = (w - totalLength) / 2;
    drawPolyene(g, cx, chainY, this.N, step);

    // λ vs N plot
    const px = M, py = chainY + 80, pw = (w - 3 * M) / 2 - 20, ph = 180;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('N', px + pw / 2, py + ph + 18);
    g.save(); g.translate(px - 26, py + ph / 2); g.rotate(-Math.PI / 2);
    g.fillText('λ_max (nm)', 0, 0); g.restore();

    const xN = (n: number) => px + ((n - 2) / (14 - 2)) * pw;
    const yL = (l: number) => py + (1 - (l - 200) / (700 - 200)) * ph;

    // Curve
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let n = 2; n <= 14; n += 0.2) {
      const X = xN(n), Y = yL(lambdaMaxNm(n));
      if (n === 2) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();

    // Visible-light band (380-780)
    g.fillStyle = 'rgba(50,150,80,0.10)';
    g.fillRect(px, yL(780), pw, yL(380) - yL(780));
    g.fillStyle = theme.inkAlpha(0.5); g.font = '10px serif'; g.textAlign = 'right';
    g.fillText('visible band', px + pw - 4, yL(380) + 12);

    // Current point
    g.fillStyle = theme.ink; g.beginPath(); g.arc(xN(this.N), yL(lambda), 5, 0, Math.PI * 2); g.fill();

    // Known markers
    const markers: [number, number, string][] = [
      [5, 380, 'retinal (5)'], [9, 470, 'lycopene-like'], [11, 450, 'β-carotene (11)'], [13, 480, 'crocetin (13)'],
    ];
    for (const [n, lam, lbl] of markers) {
      void lam; // we use the formula prediction
      const X = xN(n), Y = yL(lambdaMaxNm(n));
      g.fillStyle = theme.gold; g.beginPath(); g.arc(X, Y, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = theme.gold; g.font = '10px serif'; g.textAlign = 'left';
      g.fillText(lbl, X + 6, Y - 4);
    }

    // Right: absorption spectrum band
    const sx = M * 2 + pw, sy = py;
    const sw = w - sx - M, sh = ph;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('absorption band on the visible spectrum', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 400;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    // Absorption notch
    const sigma = 30;
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 400;
      const alpha = Math.exp(-Math.pow((lam - lambda) / sigma, 2));
      if (alpha > 0.02) {
        g.fillStyle = `rgba(0,0,0,${alpha * 0.85})`;
        g.fillRect(sx + i, sy, 1, sh);
      }
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) {
      const lx = sx + ((l - 380) / 400) * sw;
      g.fillText(`${l}`, lx, sy + sh + 14);
    }

    // Observed colour swatch
    const oy = sy + sh + 32;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('observed colour:', sx, oy);
    if (lambda < 380) {
      g.fillStyle = '#f0eee5'; g.fillRect(sx + 120, oy - 14, 80, 20);
      g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif'; g.fillText('(colourless — absorption in UV)', sx + 210, oy);
    } else {
      g.fillStyle = complementCss(lambda); g.fillRect(sx + 120, oy - 14, 80, 20);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 120, oy - 14, 80, 20);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Same physics powers retinal (vision), β-carotene (orange), porphyrins (blood, leaves) — only the chain length differs.', M, h - M);
  }
}

new Conjugated();
