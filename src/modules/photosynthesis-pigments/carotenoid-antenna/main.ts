import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Mix = 'chl-only' | 'chl-plus-carotenoid';
const MIXES: Mix[] = ['chl-only', 'chl-plus-carotenoid'];

function chl(l: number): number {
  return 0.9 * Math.exp(-Math.pow((l - 430) / 18, 2)) + 0.55 * Math.exp(-Math.pow((l - 662) / 18, 2));
}
function caro(l: number): number {
  // β-carotene triple peak 425/450/477
  return 0.7 * Math.exp(-Math.pow((l - 425) / 14, 2)) + 0.85 * Math.exp(-Math.pow((l - 450) / 14, 2)) + 0.7 * Math.exp(-Math.pow((l - 477) / 14, 2));
}

class CarotenoidAnt {
  private stage: CanvasStage;
  private mix: Mix = 'chl-plus-carotenoid';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('mix');
    if (raw && (MIXES as string[]).includes(raw)) this.mix = raw as Mix;
    const t = document.getElementById('mix') as EncToggle; t.value = this.mix;
    t.addEventListener('change', (e) => { this.mix = (e as CustomEvent).detail.value as Mix; this.draw(); notifyStateChange(); });
    registerStateParam('mix', () => this.mix);
    document.addEventListener('reset-params', () => { this.mix = 'chl-plus-carotenoid'; t.value = 'chl-plus-carotenoid'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`light-harvesting absorption · ${this.mix}`, M, M);

    const sx = M, sy = M + 30, sw = w - 2 * M, sh = 240;
    for (let i = 0; i < sw; i++) {
      const l = 380 + (i / sw) * 320;
      g.fillStyle = wavelengthCss(l);
      g.fillRect(sx + i, sy, 1, sh);
    }
    // Absorbance overlay
    for (let i = 0; i < sw; i++) {
      const l = 380 + (i / sw) * 320;
      let a = chl(l);
      if (this.mix === 'chl-plus-carotenoid') a += caro(l);
      a = Math.min(1, a);
      g.fillStyle = `rgba(0,0,0,${a * 0.85})`;
      g.fillRect(sx + i, sy, 1, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    // Curves
    const X = (l: number) => sx + ((l - 380) / 320) * sw;
    const Y = (a: number) => sy + (1 - a / 1.6) * sh;
    g.strokeStyle = '#1f7a4d'; g.lineWidth = 2;
    g.beginPath();
    for (let l = 380; l <= 700; l += 2) { const X0 = X(l), Y0 = Y(chl(l)); if (l === 380) g.moveTo(X0, Y0); else g.lineTo(X0, Y0); }
    g.stroke();
    if (this.mix === 'chl-plus-carotenoid') {
      g.strokeStyle = '#e08020'; g.lineWidth = 2;
      g.beginPath();
      for (let l = 380; l <= 700; l += 2) { const X0 = X(l), Y0 = Y(caro(l)); if (l === 380) g.moveTo(X0, Y0); else g.lineTo(X0, Y0); }
      g.stroke();
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) g.fillText(`${l}`, X(l), sy + sh + 14);

    g.fillStyle = '#1f7a4d'; g.fillRect(sx + 8, sy + 8, 16, 4); g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left'; g.fillText('chl a', sx + 30, sy + 12);
    if (this.mix === 'chl-plus-carotenoid') { g.fillStyle = '#e08020'; g.fillRect(sx + 8, sy + 22, 16, 4); g.fillStyle = theme.ink; g.fillText('β-carotene (triple peak 425/450/477)', sx + 30, sy + 26); }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Without carotenoid the 400-500 nm gap stays open — carotenoid plugs it and Förster-transfers the energy to chl a within 100 fs.', M, h - M);
  }
}

new CarotenoidAnt();
