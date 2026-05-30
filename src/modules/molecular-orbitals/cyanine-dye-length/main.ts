import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawPolyene, wavelengthCss } from '@core/render/molecular';

// Measured cyanine λ_max (R₂N⁺-(CH=CH)ₖ-NR₂, thiacarbocyanine series)
// k=1 thiacyanine ~422 nm; k=2 thiacarbocyanine ~556 nm; k=3 ~650 nm; k=4 ~760 nm; k=5 ~870 nm; k=6 ~970 nm
const MEASURED: Record<number, number> = { 1: 422, 2: 556, 3: 650, 4: 760, 5: 870, 6: 970 };

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
  return absLambda > 700 ? '#404040' : wavelengthCss(550);
}

class CyanineLength {
  private stage: CanvasStage;
  private k = 2;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.k = hydrateNumber('k', 2);
    const s = document.getElementById('k') as EncSlider; s.value = this.k;
    s.addEventListener('input', (e) => { this.k = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('k', () => Math.round(this.k));
    document.addEventListener('reset-params', () => { this.k = 2; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lambdaMeasured = MEASURED[this.k];
    const methines = 2 * this.k + 1;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`k = ${this.k} polymethine units · ${methines} methine C · λ_max (measured) = ${lambdaMeasured} nm`, M, M);

    // Draw the cyanine schematic: N-(chain)-N
    const chainY = M + 70;
    const step = 22;
    const totalLen = methines * step;
    const cx = (w - totalLen - 50) / 2;
    // Left N
    g.fillStyle = '#dbe7ee'; g.beginPath(); g.arc(cx, chainY, 12, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#1a1a1a'; g.font = '12px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N⁺', cx, chainY);
    g.textBaseline = 'alphabetic';
    // Chain
    drawPolyene(g, cx + 12, chainY, this.k, step);
    // Right N
    const rightX = cx + 12 + this.k * 2 * step;
    g.fillStyle = '#dbe7ee'; g.beginPath(); g.arc(rightX, chainY, 12, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.stroke();
    g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', rightX, chainY);
    g.textBaseline = 'alphabetic';

    // Table: k, methines, λ_max, photon E
    const ty = chainY + 70;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('measured cyanine series (Förster & Brode 1934):', M, ty);
    g.fillStyle = theme.inkAlpha(0.8); g.font = '11px monospace';
    const cols = ['k', 'methines', 'λ_max (nm)', 'photon (eV)'];
    const colX = [M + 20, M + 80, M + 180, M + 290];
    for (let i = 0; i < 4; i++) g.fillText(cols[i], colX[i], ty + 20);
    g.strokeStyle = theme.inkAlpha(0.3); g.lineWidth = 1;
    g.beginPath(); g.moveTo(M, ty + 26); g.lineTo(M + 380, ty + 26); g.stroke();
    for (let row = 0; row < 6; row++) {
      const kRow = row + 1;
      const y = ty + 40 + row * 18;
      const lam = MEASURED[kRow];
      const eV = 1240 / lam;
      g.fillStyle = kRow === this.k ? theme.crimson : theme.inkAlpha(0.8);
      g.font = kRow === this.k ? '12px monospace' : '11px monospace';
      g.fillText(`${kRow}`, colX[0], y);
      g.fillText(`${2 * kRow + 1}`, colX[1], y);
      g.fillText(`${lam}`, colX[2], y);
      g.fillText(`${eV.toFixed(2)}`, colX[3], y);
    }

    // Right: visible-spectrum strip with absorption notch
    const sx = M + 420, sy = ty, sw = w - sx - M, sh = 80;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('visible spectrum + absorption', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 500;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    const sigma = 32;
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 500;
      const alpha = Math.exp(-Math.pow((lam - lambdaMeasured) / sigma, 2));
      if (alpha > 0.02) {
        g.fillStyle = `rgba(0,0,0,${alpha * 0.85})`;
        g.fillRect(sx + i, sy, 1, sh);
      }
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700, 800]) {
      const lx = sx + ((l - 380) / 500) * sw;
      g.fillText(`${l}`, lx, sy + sh + 14);
    }

    // Observed colour swatch
    const oy = sy + sh + 32;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('observed colour:', sx, oy);
    g.fillStyle = lambdaMeasured > 750 ? '#2a2a2e' : complementCss(lambdaMeasured);
    g.fillRect(sx + 130, oy - 14, 80, 20);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 130, oy - 14, 80, 20);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Each extra –CH=CH– (one more polymethine unit) red-shifts λ_max by ~100 nm — used to tune photographic dyes for each sensitised emulsion.', M, h - M);
  }
}

new CyanineLength();
