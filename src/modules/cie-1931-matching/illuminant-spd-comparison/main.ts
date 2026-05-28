import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { ILLUMINANT_SPD, SPD_WAVELENGTHS } from '@core/math/illuminant-spd';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Ill = 'A' | 'D50' | 'D65' | 'FL11';
const ORDER: Ill[] = ['A', 'D50', 'D65', 'FL11'];
const COLOR: Record<Ill, string> = { A: '#c8772e', D50: '#c2a25a', D65: '#4a7bb0', FL11: '#4e9e6a' };
const CCT: Record<Ill, string> = { A: '2856 K incandescent', D50: '5003 K horizon daylight', D65: '6504 K noon daylight', FL11: '4000 K fluorescent (3-band)' };
const LMIN = 380, LMAX = 780;

class IlluminantSpd {
  private stage: CanvasStage;
  private ill: Ill = 'D65';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ill = (hydrateFromUrl('ill') as Ill) ?? 'D65';
    (document.getElementById('ill') as EncToggle).value = this.ill;
    registerStateParam('ill', () => this.ill);
    (document.getElementById('ill') as EncToggle).addEventListener('change', (e) => {
      this.ill = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.ill = 'D65';
      (document.getElementById('ill') as EncToggle).value = 'D65';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const padL = 44, padR = 24, padT = 36, padB = 58;
    const plotX = padL, plotY = padT, plotW = w - padL - padR, plotH = h - padT - padB;
    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH; // v normalised 0..1

    // Spectral wash baseline.
    for (let pxx = 0; pxx < plotW; pxx++) {
      const lam = LMIN + (pxx / plotW) * (LMAX - LMIN);
      ctx.fillStyle = wavelengthRGB(lam); ctx.fillRect(plotX + pxx, plotY + plotH + 4, 1, 8);
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 780; l += 50) ctx.fillText(String(l), xOf(l), plotY + plotH + 16);
    ctx.fillText('wavelength (nm)', plotX + plotW / 2, plotY + plotH + 32);
    ctx.textAlign = 'left';

    const plot = (name: Ill, active: boolean) => {
      const spd = ILLUMINANT_SPD[name];
      const max = Math.max(...spd);
      ctx.strokeStyle = active ? COLOR[name] : theme.inkAlpha(0.18);
      ctx.lineWidth = active ? 1.9 : 1;
      ctx.beginPath();
      SPD_WAVELENGTHS.forEach((l, i) => { const X = xOf(l), Y = yOf(spd[i] / max); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
      ctx.stroke();
    };
    for (const n of ORDER) if (n !== this.ill) plot(n, false);
    plot(this.ill, true);

    ctx.fillStyle = COLOR[this.ill]; ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText(this.ill, plotX + 8, plotY + 16);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(CCT[this.ill], plotX, h - 12);
  }
}

function wavelengthRGB(lam: number): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440) { r = -(lam - 440) / 60; b = 1; } else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / 20; } else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / 65; } else { r = 1; }
  const ch = (x: number) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, x)), 0.8));
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

window.addEventListener('DOMContentLoaded', () => new IlluminantSpd());
