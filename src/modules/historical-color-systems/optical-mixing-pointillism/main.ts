import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const C1: [number, number, number] = [40, 90, 200];  // blue
const C2: [number, number, number] = [240, 210, 40];  // yellow
const rgb = (c: number[]) => `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
const optical = C1.map((v, i) => (v + C2[i]) / 2) as [number, number, number];
const pigment = C1.map((v, i) => (v / 255) * (C2[i] / 255) * 255) as [number, number, number];

class Pointillism {
  private stage: CanvasStage;
  private dist = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dist = hydrateNumber('dist', 0);
    const el = document.getElementById('dist') as EncSlider;
    el.value = this.dist;
    el.addEventListener('input', (e) => { this.dist = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dist', () => Math.round(this.dist));
    document.addEventListener('reset-params', () => { this.dist = 0; el.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const fieldX = 30, fieldY = 30, fieldW = w - 230, fieldH = h - 80;
    // dot field with distance blur
    const blur = (this.dist / 100) ** 1.5 * 14;
    ctx.save();
    ctx.beginPath(); ctx.rect(fieldX, fieldY, fieldW, fieldH); ctx.clip();
    ctx.filter = blur > 0.2 ? `blur(${blur}px)` : 'none';
    const step = 14, r = 5;
    let row = 0;
    for (let y = fieldY; y < fieldY + fieldH + step; y += step) {
      let col = 0;
      for (let x = fieldX; x < fieldX + fieldW + step; x += step) {
        const useC1 = (row + col) % 2 === 0;
        ctx.beginPath(); ctx.arc(x + ((row % 2) * step) / 2, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgb(useC1 ? C1 : C2); ctx.fill();
        col++;
      }
      row++;
    }
    ctx.restore();
    ctx.filter = 'none';
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // comparison swatches
    const bx = fieldX + fieldW + 24, sw = 150, sh = 70;
    ctx.fillStyle = rgb(optical); ctx.fillRect(bx, fieldY + 10, sw, sh); ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(bx, fieldY + 10, sw, sh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('optical mix (the eye)', bx, fieldY + 10 + sh + 16);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.fillText('average → luminous grey', bx, fieldY + 10 + sh + 30);

    ctx.fillStyle = rgb(pigment); ctx.fillRect(bx, fieldY + 130, sw, sh); ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(bx, fieldY + 130, sw, sh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 12px Inter, sans-serif'; ctx.fillText('pigment mix (a palette)', bx, fieldY + 130 + sh + 16);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.fillText('subtract → dull green', bx, fieldY + 130 + sh + 30);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(this.dist > 60 ? 'far enough — the dots fuse to the optical mix, brighter than any palette green'
      : 'up close the dots stay separate — keep stepping back', fieldX, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Pointillism());
