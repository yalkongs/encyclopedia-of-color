import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

const N_CHITIN = 1.56;
const N_AIR = 1.0;

class MorphoMultilayer {
  private stage: CanvasStage;
  private d = 75;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 75);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 75; s.value = 75; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const peak = 2 * N_CHITIN * this.d; // Bragg with thin chitin + air gap (simplified)
    const colour = wavelengthCss(Math.max(380, Math.min(700, peak)));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`chitin layer d = ${this.d} nm · reflection peak λ = ${peak.toFixed(0)} nm`, M, M);

    // Schematic: Christmas tree side view (left)
    const sx = M + 30, sy = M + 50;
    const trunkW = 14, leafH = 12, leafN = 8;
    for (let i = 0; i < leafN; i++) {
      const ly = sy + i * (leafH + 4);
      const lw = 20 + (leafN - i) * 4;
      g.fillStyle = '#1a1a1a';
      g.fillRect(sx - lw / 2, ly, lw, leafH * 0.4);
    }
    g.fillStyle = '#1a1a1a'; g.fillRect(sx - trunkW / 2, sy + leafN * (leafH + 4) - 8, trunkW, 40);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('Morpho scale ridge', sx, sy + leafN * (leafH + 4) + 50);

    // Wing swatch (large)
    const wx = sx + 60, wy = M + 50, ww = 320, wh = 180;
    g.fillStyle = colour;
    g.beginPath();
    g.moveTo(wx + 20, wy);
    g.bezierCurveTo(wx + ww - 40, wy - 20, wx + ww, wy + wh, wx + 50, wy + wh + 20);
    g.bezierCurveTo(wx + 20, wy + wh / 2, wx + 30, wy + 20, wx + 20, wy);
    g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();

    // Spectrum strip
    const py = wy + wh + 50, pw = w - 2 * M, px = M, ph = 50;
    for (let i = 0; i < pw; i++) {
      const l = 380 + (i / pw) * 320;
      g.fillStyle = wavelengthCss(l);
      g.fillRect(px + i, py, 1, ph);
    }
    const xp = px + ((peak - 380) / 320) * pw;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath(); g.moveTo(xp, py); g.lineTo(xp, py + ph); g.stroke();
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Iridescence is broad-angle because the Christmas-tree geometry randomises the reflection angle — Morpho stays bright even off-axis.', M, h - M);
    void N_AIR;
  }
}

new MorphoMultilayer();
