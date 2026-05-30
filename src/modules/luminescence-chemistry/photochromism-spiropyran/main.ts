import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Photochrom {
  private stage: CanvasStage;
  private UV = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.UV = hydrateNumber('UV', 10);
    const s = document.getElementById('UV') as EncSlider; s.value = this.UV;
    s.addEventListener('input', (e) => { this.UV = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('UV', () => Math.round(this.UV));
    document.addEventListener('reset-params', () => { this.UV = 10; s.value = 10; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Steady-state: k_f * UV = k_b * [MC], k_b ≈ 0.1, k_f ≈ 0.05 → [MC]/[total] = k_f*UV/(k_f*UV+k_b)
    const kf = 0.05, kb = 0.4;
    const frac = (kf * this.UV) / (kf * this.UV + kb);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`UV = ${this.UV}× · merocyanine fraction = ${frac.toFixed(2)}`, M, M);

    // Two forms: SP (colourless) and MC (purple-blue ~560nm)
    const sy = M + 50;
    const sw = 200, sh = 160;
    // SP swatch (colourless)
    g.fillStyle = '#f0eee5';
    g.fillRect(M + 30, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 30, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('spiropyran (closed)', M + 30 + sw / 2, sy + sh + 16);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('colourless · sp³ C-O bond intact', M + 30 + sw / 2, sy + sh + 30);

    // Arrow
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    const aX1 = M + 30 + sw + 20, aX2 = aX1 + 100;
    g.beginPath();
    g.moveTo(aX1, sy + sh / 2 - 12); g.lineTo(aX2, sy + sh / 2 - 12);
    g.moveTo(aX2 - 4, sy + sh / 2 - 16); g.lineTo(aX2, sy + sh / 2 - 12); g.lineTo(aX2 - 4, sy + sh / 2 - 8);
    g.stroke();
    // reverse arrow
    g.beginPath();
    g.moveTo(aX2, sy + sh / 2 + 12); g.lineTo(aX1, sy + sh / 2 + 12);
    g.moveTo(aX1 + 4, sy + sh / 2 + 8); g.lineTo(aX1, sy + sh / 2 + 12); g.lineTo(aX1 + 4, sy + sh / 2 + 16);
    g.stroke();
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('UV →', (aX1 + aX2) / 2, sy + sh / 2 - 16);
    g.fillText('← Δ / vis', (aX1 + aX2) / 2, sy + sh / 2 + 26);

    // MC swatch (purple-blue, intensity scales with frac)
    const mcRGB: [number, number, number] = [60, 30, 110];
    const dispR = 240 + (mcRGB[0] - 240) * frac;
    const dispG = 235 + (mcRGB[1] - 235) * frac;
    const dispB = 230 + (mcRGB[2] - 230) * frac;
    g.fillStyle = `rgb(${Math.round(dispR)},${Math.round(dispG)},${Math.round(dispB)})`;
    g.fillRect(aX2 + 20, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(aX2 + 20, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('merocyanine (open, planar)', aX2 + 20 + sw / 2, sy + sh + 16);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(`planar conjugation · λ_max ≈ 560 nm`, aX2 + 20 + sw / 2, sy + sh + 30);

    // Fraction bar
    const by = sy + sh + 80;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(`steady-state [MC]/[total] = k_f·UV / (k_f·UV + k_b) = ${frac.toFixed(3)}`, M, by);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, by + 10, w - 2 * M, 16);
    g.fillStyle = theme.crimson; g.fillRect(M, by + 10, frac * (w - 2 * M), 16);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Same chemistry: Transitions lenses use spirooxazines (faster kinetics, more colour). Reversible photochromism is the basis of write-erase optical memory and smart windows.', M, h - M);
  }
}

new Photochrom();
