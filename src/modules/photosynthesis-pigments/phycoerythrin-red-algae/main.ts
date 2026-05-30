import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

// Seawater attenuation (rough): red attenuated most, blue-green penetrates
function transmission(l: number, depth: number): number {
  // Per-meter attenuation coefficient (1/m): blue 0.02, green 0.05, red 0.4
  let k = 0.05;
  if (l < 470) k = 0.025 + (470 - l) / 90 * 0.03;
  else if (l < 570) k = 0.04 + (l - 470) / 100 * 0.04;
  else if (l < 650) k = 0.10 + (l - 570) / 80 * 0.30;
  else k = 0.50;
  return Math.exp(-k * depth);
}
function chl(l: number): number {
  return 0.9 * Math.exp(-Math.pow((l - 430) / 18, 2)) + 0.55 * Math.exp(-Math.pow((l - 662) / 18, 2));
}
function pe(l: number): number {
  return 0.95 * Math.exp(-Math.pow((l - 565) / 25, 2));
}

class Phyco {
  private stage: CanvasStage;
  private depth = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.depth = hydrateNumber('depth', 20);
    const s = document.getElementById('depth') as EncSlider; s.value = this.depth;
    s.addEventListener('input', (e) => { this.depth = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('depth', () => Math.round(this.depth));
    document.addEventListener('reset-params', () => { this.depth = 20; s.value = 20; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`depth = ${this.depth} m · seawater filters out red first`, M, M);

    const sx = M, sy = M + 30, sw = w - 2 * M, sh = 100;
    // Incident underwater spectrum
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('underwater spectrum at depth', sx, sy - 4);
    for (let i = 0; i < sw; i++) {
      const l = 380 + (i / sw) * 320;
      const T = transmission(l, this.depth);
      const css = wavelengthCss(l);
      const m = css.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
      g.fillStyle = `rgb(${Math.round(+m[1] * T)},${Math.round(+m[2] * T)},${Math.round(+m[3] * T)})`;
      g.fillRect(sx + i, sy, 1, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    // Capture efficiency by chl alone vs +pe
    let capChl = 0, capPE = 0, n = 0;
    for (let l = 380; l <= 700; l += 5) {
      const T = transmission(l, this.depth);
      capChl += T * chl(l); capPE += T * (chl(l) + pe(l)); n++;
    }
    capChl /= n; capPE /= n;

    // Bars
    const by = sy + sh + 40;
    const bw = w - 2 * M;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('captured photon density', sx, by);
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText(`chl only:  ${capChl.toFixed(2)}`, sx, by + 22);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 130, by + 12, bw / 2, 14);
    g.fillStyle = '#1f7a4d'; g.fillRect(sx + 130, by + 12, capChl * bw, 14);

    g.fillStyle = theme.inkAlpha(0.65); g.fillText(`+ phycoerythrin: ${capPE.toFixed(2)} (× ${(capPE/capChl).toFixed(1)})`, sx, by + 50);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 130, by + 40, bw / 2, 14);
    g.fillStyle = theme.crimson; g.fillRect(sx + 130, by + 40, capPE * bw, 14);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Phycoerythrin pulls red algae into a depth niche chlorophyll-only green algae cannot exploit — niche pigment + niche depth.', M, h - M);
  }
}

new Phyco();
