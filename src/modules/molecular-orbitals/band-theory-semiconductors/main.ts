import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { drawBandDiagram, wavelengthCss } from '@core/render/molecular';

const ANCHORS: { name: string; eg: number; colour: string }[] = [
  { name: 'Si',   eg: 1.12, colour: 'opaque grey (Eg in IR)' },
  { name: 'CdSe', eg: 1.74, colour: 'dark red' },
  { name: 'CdS',  eg: 2.42, colour: 'yellow' },
  { name: 'ZnSe', eg: 2.70, colour: 'yellow-green' },
  { name: 'ZnS',  eg: 3.68, colour: 'colourless (Eg in UV)' },
  { name: 'TiO₂', eg: 3.20, colour: 'white (Eg in UV)' },
];

class BandgapModule {
  private stage: CanvasStage;
  private egRaw = 240; // ×10⁻² eV → 2.40 eV

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.egRaw = hydrateNumber('eg', 240);
    const s = document.getElementById('eg') as EncSlider; s.value = this.egRaw;
    s.addEventListener('input', (e) => { this.egRaw = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('eg', () => Math.round(this.egRaw));
    document.addEventListener('reset-params', () => { this.egRaw = 240; s.value = 240; this.draw(); notifyStateChange(); });
  }

  // For a semiconductor with bandgap Eg eV, the "observed" colour is the integrated transmittance
  // of the visible spectrum: absorb everything with photon E > Eg (λ < 1240/Eg)
  private observedCss(eg: number): string {
    const edgeLam = 1240 / eg; // nm
    if (edgeLam >= 780) return '#2a2a2e'; // all visible absorbed → opaque dark
    if (edgeLam <= 380) return '#f5f3ec'; // all visible transmitted → white/colourless
    // Otherwise: average colour of the transmitted band [edgeLam..780]
    let r = 0, gn = 0, b = 0, n = 0;
    for (let l = edgeLam; l < 780; l += 5) {
      const css = wavelengthCss(l);
      const m = css.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
      r += +m[1]; gn += +m[2]; b += +m[3]; n++;
    }
    if (n === 0) return '#f5f3ec';
    return `rgb(${Math.round(r / n)},${Math.round(gn / n)},${Math.round(b / n)})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const eg = this.egRaw / 100;
    const edgeLam = 1240 / eg;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Eg = ${eg.toFixed(2)} eV · absorption edge λ = ${edgeLam.toFixed(0)} nm`, M, M);

    // Band diagram on the left
    const bdX = M + 10, bdY = M + 30, bdW = 230, bdH = 240;
    drawBandDiagram(g, bdX, bdY, bdW, bdH, eg, 4);

    // Anchor table
    const tx = bdX + bdW + 40;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('reference materials:', tx, bdY + 12);
    g.fillStyle = theme.inkAlpha(0.8); g.font = '11px monospace';
    const cols = ['material', 'Eg (eV)', 'edge (nm)', 'colour'];
    const colX = [tx + 0, tx + 90, tx + 170, tx + 260];
    g.fillText(cols[0], colX[0], bdY + 32);
    g.fillText(cols[1], colX[1], bdY + 32);
    g.fillText(cols[2], colX[2], bdY + 32);
    g.fillText(cols[3], colX[3], bdY + 32);
    g.strokeStyle = theme.inkAlpha(0.3); g.beginPath(); g.moveTo(tx, bdY + 38); g.lineTo(tx + 460, bdY + 38); g.stroke();
    for (let i = 0; i < ANCHORS.length; i++) {
      const a = ANCHORS[i];
      const y = bdY + 56 + i * 22;
      const active = Math.abs(a.eg - eg) < 0.1;
      g.fillStyle = active ? theme.crimson : theme.inkAlpha(0.85);
      g.font = active ? '12px monospace' : '11px monospace';
      g.fillText(a.name, colX[0], y);
      g.fillText(a.eg.toFixed(2), colX[1], y);
      g.fillText((1240 / a.eg).toFixed(0), colX[2], y);
      g.fillText(a.colour, colX[3], y);
    }

    // Spectrum strip
    const sy = bdY + bdH + 40, sx = M, sw = w - 2 * M, sh = 60;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('visible spectrum · absorbed (left of edge) vs transmitted (right of edge)', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 400;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    // Black overlay above edge (absorbed)
    if (edgeLam > 380 && edgeLam < 780) {
      const xEdge = sx + ((edgeLam - 380) / 400) * sw;
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(sx, sy, xEdge - sx, sh);
      g.strokeStyle = theme.crimson; g.lineWidth = 2;
      g.beginPath(); g.moveTo(xEdge, sy); g.lineTo(xEdge, sy + sh); g.stroke();
      g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(`edge ${edgeLam.toFixed(0)} nm`, Math.max(sx + 40, Math.min(sx + sw - 40, xEdge)), sy - 14);
    } else if (edgeLam >= 780) {
      g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(sx, sy, sw, sh);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) {
      const lx = sx + ((l - 380) / 400) * sw;
      g.fillText(`${l}`, lx, sy + sh + 14);
    }

    // Observed swatch
    const oy = sy + sh + 36;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('observed colour (transmitted band):', sx, oy);
    g.fillStyle = this.observedCss(eg);
    g.fillRect(sx + 260, oy - 14, 100, 22);
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(sx + 260, oy - 14, 100, 22);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Nanoscale quantum confinement (CdSe quantum dots) raises Eg with size → tuneable colour. The same idea drives LED design.', M, h - M);
  }
}

new BandgapModule();
