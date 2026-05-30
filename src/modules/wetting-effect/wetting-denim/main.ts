import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N_FIBRE = 1.50, N_AIR = 1.00, N_WATER = 1.33;
const DRY_COLOUR: [number, number, number] = [110, 130, 175];  // pale denim

class WettingDenim {
  private stage: CanvasStage;
  private wet = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.wet = hydrateNumber('wet', 50);
    const s = document.getElementById('wet') as EncSlider; s.value = this.wet;
    s.addEventListener('input', (e) => { this.wet = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('wet', () => Math.round(this.wet));
    document.addEventListener('reset-params', () => { this.wet = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const f = this.wet / 100;
    const nVoid = N_AIR * (1 - f) + N_WATER * f;
    const dn = N_FIBRE - nVoid;
    const scattering = dn * dn;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`wetness = ${this.wet}% · void index = ${nVoid.toFixed(2)} · Δn = ${dn.toFixed(2)} · scattering ∝ ${scattering.toFixed(3)}`, M, M);

    // Fabric swatch (darker with water)
    const dark = 1 - scattering / 0.25; // 0..1
    const baseR = DRY_COLOUR[0] * dark, baseG = DRY_COLOUR[1] * dark, baseB = DRY_COLOUR[2] * dark;
    const sX = M + 30, sY = M + 50, sW = 300, sH = 240;
    g.fillStyle = `rgb(${Math.round(baseR)},${Math.round(baseG)},${Math.round(baseB)})`;
    g.fillRect(sX, sY, sW, sH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sX, sY, sW, sH);
    // Add diagonal weave texture
    g.strokeStyle = `rgba(0,0,0,${0.04 + 0.06 * (1 - f)})`; g.lineWidth = 1;
    for (let i = -sH; i < sW + sH; i += 6) {
      g.beginPath(); g.moveTo(sX + i, sY); g.lineTo(sX + i + sH, sY + sH); g.stroke();
    }
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('denim fabric', sX + sW / 2, sY + sH + 16);

    // Right side: cross-section + scattering bar
    const rx = sX + sW + 50, ry = sY;
    const rw = w - rx - M, rh = 100;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('fibre cross-section (water fills pores)', rx, ry - 4);

    // Pretend cross section: row of yarn discs, with water rings
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(rx, ry, rw, rh);
    const nFibres = 8;
    const fW = rw / nFibres;
    for (let i = 0; i < nFibres; i++) {
      const cx = rx + (i + 0.5) * fW;
      const cy = ry + rh / 2;
      const fR = Math.min(fW, rh) * 0.4;
      // Water ring
      if (f > 0.05) {
        g.fillStyle = `rgba(50,100,200,${0.35 + 0.4 * f})`;
        g.beginPath(); g.arc(cx, cy, fR * 1.3, 0, Math.PI * 2); g.fill();
      }
      // Fibre core
      g.fillStyle = '#dcd8c8';
      g.beginPath(); g.arc(cx, cy, fR, 0, Math.PI * 2); g.fill();
      g.strokeStyle = theme.inkAlpha(0.7); g.lineWidth = 1; g.stroke();
    }

    // Scattering bar
    const by = ry + rh + 24;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('scattering strength ∝ Δn²', rx, by);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(rx, by + 8, rw, 16);
    g.fillStyle = theme.crimson; g.fillRect(rx, by + 8, (scattering / 0.25) * rw, 16);
    g.fillStyle = theme.gold; g.font = '10px serif'; g.textAlign = 'center';
    // dry marker (f=0)
    g.fillText('dry', rx + rw, by + 36);
    g.fillText('soaked', rx + (0.17 * 0.17 / 0.25) * rw, by + 36);
    g.strokeStyle = theme.gold; g.lineWidth = 1;
    g.beginPath(); g.moveTo(rx + (0.17 * 0.17 / 0.25) * rw, by + 8); g.lineTo(rx + (0.17 * 0.17 / 0.25) * rw, by + 24); g.stroke();

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same physics: hair looks darker when wet, sand pile darkens as the tide comes in. Index matching kills diffuse scatter and reveals the underlying absorption colour.', M, h - M);
  }
}

new WettingDenim();
