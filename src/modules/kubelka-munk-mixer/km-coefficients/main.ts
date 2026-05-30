import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Pig = 'titanium-white' | 'cadmium-red' | 'phthalo-blue' | 'carbon-black';
const PIGS: Pig[] = ['titanium-white', 'cadmium-red', 'phthalo-blue', 'carbon-black'];

// Simplified spectral K(λ), S(λ) — approximate published values from Berns 2019 Appendix
function K(pig: Pig, lam: number): number {
  switch (pig) {
    case 'titanium-white': return 0.005;  // flat low absorption
    case 'cadmium-red':    return lam < 550 ? 4.0 * Math.exp(-Math.pow((lam - 450) / 60, 2)) + 0.5 : 0.05;
    case 'phthalo-blue':   return lam > 530 ? 4.0 * Math.exp(-Math.pow((lam - 620) / 80, 2)) + 0.4 : 0.2;
    case 'carbon-black':   return 5.0;     // flat very high
  }
}
function S(pig: Pig, lam: number): number {
  switch (pig) {
    case 'titanium-white': return 4.0 - (lam - 400) / 300 * 1.5;  // higher at blue (smaller particles)
    case 'cadmium-red':    return 1.5;
    case 'phthalo-blue':   return 0.8;
    case 'carbon-black':   return 0.05;
  }
}

function reflectance(k: number, s: number): number {
  const ks = k / Math.max(0.001, s);
  return 1 + ks - Math.sqrt(ks * (ks + 2));
}

class KMCoef {
  private stage: CanvasStage;
  private pig: Pig = 'cadmium-red';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('pig');
    if (raw && (PIGS as string[]).includes(raw)) this.pig = raw as Pig;
    const t = document.getElementById('pig') as EncToggle; t.value = this.pig;
    t.addEventListener('change', (e) => { this.pig = (e as CustomEvent).detail.value as Pig; this.draw(); notifyStateChange(); });
    registerStateParam('pig', () => this.pig);
    document.addEventListener('reset-params', () => { this.pig = 'cadmium-red'; t.value = 'cadmium-red'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pigment: ${this.pig}`, M, M);

    // Plot K, S, R∞ across 400-700
    const px = M, py = M + 30, pw = w - 2 * M, ph = 220;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('K, S, R∞ vs wavelength', px + pw / 2, py - 6);
    g.fillText('λ (nm)', px + pw / 2, py + ph + 16);

    const X = (l: number) => px + ((l - 400) / 300) * pw;
    const Y = (v: number, maxV: number) => py + (1 - v / maxV) * ph;

    // K curve (red)
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let l = 400; l <= 700; l += 5) {
      const v = K(this.pig, l);
      const X0 = X(l), Y0 = Y(Math.min(5, v), 5);
      if (l === 400) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    // S curve (green)
    g.strokeStyle = '#1f7a4d'; g.lineWidth = 2;
    g.beginPath();
    for (let l = 400; l <= 700; l += 5) {
      const v = S(this.pig, l);
      const X0 = X(l), Y0 = Y(Math.min(5, v), 5);
      if (l === 400) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    // R∞ curve (blue, 0..1)
    g.strokeStyle = '#1f567a'; g.lineWidth = 2;
    g.beginPath();
    for (let l = 400; l <= 700; l += 2) {
      const R = reflectance(K(this.pig, l), S(this.pig, l));
      const X0 = X(l), Y0 = Y(R * 5, 5); // scale R 0..1 → 0..5 to share axis
      if (l === 400) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();

    // Legend
    const lx = px + 20, ly = py + 20;
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('K(λ) absorption', lx, ly);
    g.fillStyle = '#1f7a4d'; g.fillText('S(λ) scattering', lx, ly + 14);
    g.fillStyle = '#1f567a'; g.fillText('R∞(λ) reflectance', lx, ly + 28);

    // Visible wavelength axis ticks
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) g.fillText(`${l}`, X(l), py + ph + 30);

    // Colour swatch under spectrum
    const sx = px, sy = py + ph + 40, sw = pw, sh = 50;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('R∞ × wavelength = visible colour', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      const l = 400 + (i / sw) * 300;
      const R = reflectance(K(this.pig, l), S(this.pig, l));
      const base = wavelengthCss(l);
      const m = base.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
      const r = +m[1] * R, gn = +m[2] * R, b = +m[3] * R;
      g.fillStyle = `rgb(${Math.round(r)},${Math.round(gn)},${Math.round(b)})`;
      g.fillRect(sx + i, sy, 1, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Mix two pigments → mass-fraction-weighted K and S → R∞ — the basis of every paint colour-matching tool.', M, h - M);
  }
}

new KMCoef();
