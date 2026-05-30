import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Show = 'a' | 'b' | 'both';
const SHOWS: Show[] = ['a', 'b', 'both'];

function chlA(lam: number): number {
  // Soret 430, Q 662
  return 0.9 * Math.exp(-Math.pow((lam - 430) / 18, 2)) + 0.55 * Math.exp(-Math.pow((lam - 662) / 18, 2));
}
function chlB(lam: number): number {
  // Soret 453, Q 642
  return 0.7 * Math.exp(-Math.pow((lam - 453) / 18, 2)) + 0.4 * Math.exp(-Math.pow((lam - 642) / 18, 2));
}

class ChlAB {
  private stage: CanvasStage;
  private show: Show = 'both';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('pig');
    if (raw && (SHOWS as string[]).includes(raw)) this.show = raw as Show;
    const t = document.getElementById('pig') as EncToggle; t.value = this.show;
    t.addEventListener('change', (e) => { this.show = (e as CustomEvent).detail.value as Show; this.draw(); notifyStateChange(); });
    registerStateParam('pig', () => this.show);
    document.addEventListener('reset-params', () => { this.show = 'both'; t.value = 'both'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`showing: chlorophyll ${this.show === 'both' ? 'a + b' : this.show}`, M, M);

    // Spectrum strip + absorbance plot overlay
    const sx = M, sy = M + 40, sw = w - 2 * M, sh = 260;
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 320;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    // Combined absorbance overlay
    g.fillStyle = `rgba(0,0,0,0.8)`;
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 320;
      let a = 0;
      if (this.show !== 'b') a += chlA(lam);
      if (this.show !== 'a') a += chlB(lam);
      a = Math.min(1, a);
      g.fillStyle = `rgba(0,0,0,${a * 0.85})`;
      g.fillRect(sx + i, sy, 1, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(sx, sy, sw, sh);

    // Curves overlay
    const X = (l: number) => sx + ((l - 380) / 320) * sw;
    const Y = (a: number) => sy + (1 - a / 1.2) * sh;
    if (this.show !== 'b') {
      g.strokeStyle = '#1f7a4d'; g.lineWidth = 2;
      g.beginPath();
      for (let l = 380; l <= 700; l += 2) {
        const X0 = X(l), Y0 = Y(chlA(l));
        if (l === 380) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
      }
      g.stroke();
    }
    if (this.show !== 'a') {
      g.strokeStyle = '#a3a300'; g.lineWidth = 2;
      g.beginPath();
      for (let l = 380; l <= 700; l += 2) {
        const X0 = X(l), Y0 = Y(chlB(l));
        if (l === 380) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
      }
      g.stroke();
    }
    // Axis ticks
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 450, 500, 550, 600, 650, 700]) g.fillText(`${l}`, X(l), sy + sh + 14);

    // Legend
    g.fillStyle = '#1f7a4d'; g.fillRect(sx + 8, sy + 8, 16, 4); g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left'; g.fillText('chl a (430/662)', sx + 30, sy + 12);
    g.fillStyle = '#a3a300'; g.fillRect(sx + 8, sy + 22, 16, 4); g.fillStyle = theme.ink; g.fillText('chl b (453/642)', sx + 30, sy + 26);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Both pigments absorb at the spectrum extremes and leave the green window — that\'s why every higher plant looks green to us.', M, h - M);
  }
}

new ChlAB();
