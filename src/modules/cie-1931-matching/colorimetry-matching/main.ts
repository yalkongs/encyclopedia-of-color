import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 440, LMAX = 650;

/** CIE 1931 RGB colour-matching amounts at wavelength λ (XYZ→RGB, primaries 700/546.1/435.8). */
function rgbCMF(lam: number): [number, number, number] {
  const row = CMF_1931_2DEG.find((r) => r.lambda === Math.round(lam / 5) * 5) ?? CMF_1931_2DEG[0];
  const { xBar: X, yBar: Y, zBar: Z } = row;
  return [
    0.41847 * X - 0.15866 * Y - 0.082835 * Z,
    -0.091169 * X + 0.25243 * Y + 0.015708 * Z,
    0.00092090 * X - 0.0025498 * Y + 0.17860 * Z,
  ];
}
function wavelengthRGB(lam: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (lam < 440) { r = -(lam - 440) / 60; b = 1; } else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / 20; } else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / 65; } else { r = 1; }
  const f = (x: number) => Math.pow(Math.max(0, Math.min(1, x)), 0.8);
  return [f(r), f(g), f(b)];
}

class ColorimetryMatching {
  private stage: CanvasStage;
  private lambda = 500;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 500);
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('lambda', () => this.lambda);
    (document.getElementById('lambda') as EncSlider).addEventListener('input', (e) => {
      this.lambda = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.lambda = 500;
      (document.getElementById('lambda') as EncSlider).value = 500;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const [r, g, b] = rgbCMF(this.lambda);
    const scale = Math.max(Math.abs(r), Math.abs(g), Math.abs(b), 1e-6);
    const rn = r / scale, gn = g / scale, bn = b / scale;
    const rNeg = rn < 0;

    // --- Split bipartite field. ---
    const fx = 40, fy = 50, fw = w * 0.5, fh = h * 0.3;
    const [tr, tg, tb] = wavelengthRGB(this.lambda);
    // Test half: spectral colour, with negative red spilled in.
    const redMix = rNeg ? -rn * 0.6 : 0;
    ctx.fillStyle = `rgb(${Math.round((tr + redMix) * 255)},${Math.round(tg * 255)},${Math.round(tb * 255)})`;
    ctx.fillRect(fx, fy, fw / 2, fh);
    // Match half: positive primary mix.
    const rp = Math.max(0, rn);
    const mr = rp * 0.9 + gn * 0.25 + bn * 0.25, mg = gn * 0.85 + rp * 0.1, mb = bn * 0.9 + gn * 0.15;
    ctx.fillStyle = `rgb(${Math.round(mr * 255)},${Math.round(mg * 255)},${Math.round(mb * 255)})`;
    ctx.fillRect(fx + fw / 2, fy, fw / 2, fh);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4; ctx.strokeRect(fx, fy, fw, fh);
    ctx.beginPath(); ctx.moveTo(fx + fw / 2, fy); ctx.lineTo(fx + fw / 2, fy + fh); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(rNeg ? 'test + red' : 'test', fx + fw / 4, fy + fh + 16);
    ctx.fillText('R + G + B mix', fx + fw * 0.75, fy + fh + 16);
    ctx.textAlign = 'left';

    // Amounts.
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillStyle = theme.crimson; ctx.fillText(`R ${rn.toFixed(2)}${rNeg ? '  (added to test)' : ''}`, w * 0.6, fy + 18);
    ctx.fillStyle = '#2f8f4e'; ctx.fillText(`G ${gn.toFixed(2)}`, w * 0.6, fy + 38);
    ctx.fillStyle = '#2b6cb0'; ctx.fillText(`B ${bn.toFixed(2)}`, w * 0.6, fy + 58);

    // --- r̄ ḡ b̄ plot. ---
    const px = 44, py = fy + fh + 50, pw = w - px * 1.4, ph = h - py - 44;
    const xOf = (l: number) => px + ((l - LMIN) / (LMAX - LMIN)) * pw;
    const ymax = 0.35, yOf = (v: number) => py + ph / 2 - (v / ymax) * (ph / 2);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, yOf(0)); ctx.lineTo(px + pw, yOf(0)); ctx.stroke();
    const curve = (idx: number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      let first = true;
      for (let l = LMIN; l <= LMAX; l += 2) { const v = rgbCMF(l)[idx]; const X = xOf(l), Y = yOf(v); if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y); }
      ctx.stroke();
    };
    curve(0, theme.crimson); curve(1, '#2f8f4e'); curve(2, '#2b6cb0');
    const mx = xOf(this.lambda);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, py); ctx.lineTo(mx, py + ph); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('r̄ ḡ b̄ matching functions — note r̄ dips negative near cyan', px, py - 6);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(rNeg ? `λ ${this.lambda} nm needs red on the test side — no positive RGB mix can match it` : `λ ${this.lambda} nm matched by a positive RGB mix`, px, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new ColorimetryMatching());
