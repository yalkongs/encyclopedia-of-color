import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { spectralToXYZ } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// illustrative reflectance spectra; reference Lab is derived from the spectrum + a small per-patch
// measurement drift, so the displayed ΔE values are realistic (not literal ISO references).
type Patch = { name: string; col: string; drift: [number, number, number]; spd: (l: number) => number };
const gauss = (l: number, mu: number, sd: number) => Math.exp(-0.5 * ((l - mu) / sd) ** 2);
const PATCHES: Patch[] = [
  { name: 'paper',   col: '#f5f3eb', drift: [ 0.3,  0.4, -0.7], spd: () => 0.88 },
  { name: 'C',       col: '#00aeef', drift: [-1.2,  0.6,  1.8], spd: (l) => 0.85 * gauss(l, 490, 38) + 0.05 },
  { name: 'M',       col: '#ec008c', drift: [ 0.9, -2.4,  2.1], spd: (l) => 0.80 * gauss(l, 435, 38) + 0.60 * gauss(l, 660, 42) + 0.04 },
  { name: 'Y',       col: '#fff200', drift: [-0.5,  1.6, -3.2], spd: (l) => l < 495 ? 0.05 : 0.90 },
  { name: 'K',       col: '#1a1714', drift: [ 1.4,  0.5,  0.2], spd: () => 0.04 },
  { name: 'R (M+Y)', col: '#e63027', drift: [ 0.4,  3.7, -1.9], spd: (l) => l < 560 ? 0.05 : 0.85 },
  { name: 'G (C+Y)', col: '#2d9c4d', drift: [-2.6,  1.3,  4.4], spd: (l) => 0.85 * gauss(l, 540, 45) + 0.05 },
  { name: 'B (C+M)', col: '#2b3aa6', drift: [ 2.8, -1.1, -0.6], spd: (l) => 0.85 * gauss(l, 460, 40) + 0.05 },
];

const WHITE = { X: 0.95047, Y: 1.0, Z: 1.08883 };
function fLab(t: number): number { const e = 216 / 24389; return t > e ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
function xyzToLab(X: number, Y: number, Z: number): [number, number, number] {
  const fx = fLab(X / WHITE.X), fy = fLab(Y / WHITE.Y), fz = fLab(Z / WHITE.Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function de(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

class SpectroI1 {
  private stage: CanvasStage;
  private patch = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.patch = hydrateNumber('patch', 3);
    const s = document.getElementById('patch') as EncSlider;
    s.value = this.patch;
    s.addEventListener('input', (e) => { this.patch = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('patch', () => Math.round(this.patch));
    document.addEventListener('reset-params', () => { this.patch = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const idx = Math.round(this.patch) - 1;
    const p = PATCHES[idx];

    // test strip across the top
    const sx0 = 40, sy0 = 50, sw = w - 80, sh = 80, cw = sw / PATCHES.length;
    PATCHES.forEach((pp, i) => {
      ctx.fillStyle = pp.col; ctx.fillRect(sx0 + i * cw + 4, sy0, cw - 8, sh);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(sx0 + i * cw + 4, sy0, cw - 8, sh);
      ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(pp.name, sx0 + i * cw + cw / 2, sy0 + sh + 16);
    });
    // i1 probe icon over the active patch
    const probeX = sx0 + idx * cw + cw / 2;
    ctx.fillStyle = '#3a3530'; ctx.fillRect(probeX - 22, sy0 - 36, 44, 30);
    ctx.fillStyle = '#b0392f'; ctx.beginPath(); ctx.arc(probeX, sy0 - 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b0392f'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(probeX, sy0 - 6); ctx.lineTo(probeX, sy0 + 4); ctx.stroke();

    // integrate spectrum
    const xyz = spectralToXYZ(p.spd);
    // normalise by paper-equivalent flat 0.88 so paper maps near Y=1 — use the same integrator on a flat 0.88 spectrum
    const refY = spectralToXYZ(() => 0.88).Y;
    const X = xyz.X / refY, Y = xyz.Y / refY, Z = xyz.Z / refY;
    const lab = xyzToLab(X, Y, Z);
    const refLab: [number, number, number] = [lab[0] + p.drift[0], lab[1] + p.drift[1], lab[2] + p.drift[2]];
    const dE = de(lab, refLab);

    // spectrum chart (left half of lower area)
    const gx = 60, gy = sy0 + sh + 56, gw = w * 0.6 - 80, gh = h - gy - 60;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 400; l <= 700; l += 50) { const x = gx + ((l - 380) / 350) * gw; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); }
    for (let r = 0; r <= 1; r += 0.25) { const y = gy + gh - r * gh; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = p.col; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let l = 380; l <= 730; l += 2) { const x = gx + ((l - 380) / 350) * gw, y = gy + gh - Math.min(1, p.spd(l)) * gh; l === 380 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 700; l += 50) ctx.fillText(`${l}`, gx + ((l - 380) / 350) * gw, gy + gh + 14);
    ctx.fillText('wavelength (nm) · reflectance 0–1', gx + gw / 2, gy + gh + 30);

    // readout panel (right)
    const rx = gx + gw + 40, ry = gy;
    ctx.fillStyle = theme.ink; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`patch: ${p.name}`, rx, ry + 4);
    ctx.font = '13px Inter, sans-serif'; ctx.fillStyle = theme.ink;
    ctx.fillText(`measured  L* ${lab[0].toFixed(1)}   a* ${lab[1].toFixed(1)}   b* ${lab[2].toFixed(1)}`, rx, ry + 28);
    ctx.fillStyle = theme.inkSoft;
    ctx.fillText(`reference L* ${refLab[0].toFixed(1)}   a* ${refLab[1].toFixed(1)}   b* ${refLab[2].toFixed(1)}`, rx, ry + 50);
    const passLine = dE <= 5;
    ctx.fillStyle = passLine ? '#2e7d4f' : '#9b2828'; ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText(`ΔE  ${dE.toFixed(1)}   ${passLine ? '✓ within ISO 5' : '✗ over tolerance'}`, rx, ry + 92);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('one probe reading = one spectrum → one Lab → one ΔE; that ΔE is what tells the press operator to adjust', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new SpectroI1());
