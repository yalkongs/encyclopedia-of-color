import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Standard ColorChecker Classic sRGB (8-bit) values + names (BabelColor / X-Rite averages)
const PATCHES: { name: string; rgb: [number, number, number] }[] = [
  { name: 'dark skin', rgb: [115, 82, 68] }, { name: 'light skin', rgb: [194, 150, 130] },
  { name: 'blue sky', rgb: [98, 122, 157] }, { name: 'foliage', rgb: [87, 108, 67] },
  { name: 'blue flower', rgb: [133, 128, 177] }, { name: 'bluish green', rgb: [103, 189, 170] },
  { name: 'orange', rgb: [214, 126, 44] }, { name: 'purplish blue', rgb: [80, 91, 166] },
  { name: 'moderate red', rgb: [193, 90, 99] }, { name: 'purple', rgb: [94, 60, 108] },
  { name: 'yellow green', rgb: [157, 188, 64] }, { name: 'orange yellow', rgb: [224, 163, 46] },
  { name: 'blue', rgb: [56, 61, 150] }, { name: 'green', rgb: [70, 148, 73] },
  { name: 'red', rgb: [175, 54, 60] }, { name: 'yellow', rgb: [231, 199, 31] },
  { name: 'magenta', rgb: [187, 86, 149] }, { name: 'cyan', rgb: [8, 133, 161] },
  { name: 'white', rgb: [243, 243, 242] }, { name: 'neutral 8', rgb: [200, 200, 200] },
  { name: 'neutral 6.5', rgb: [160, 160, 160] }, { name: 'neutral 5', rgb: [122, 122, 121] },
  { name: 'neutral 3.5', rgb: [85, 85, 85] }, { name: 'black', rgb: [52, 52, 52] },
];

class ColorChecker {
  private stage: CanvasStage;
  private sel = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sel = hydrateNumber('sel', 1);
    const s = document.getElementById('sel') as EncSlider;
    s.value = this.sel;
    s.addEventListener('input', (e) => { this.sel = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sel', () => Math.round(this.sel));
    document.addEventListener('reset-params', () => { this.sel = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#2a2a2c'; ctx.fillRect(0, 0, w, h);
    const cols = 6, rows = 4;
    const m = 30, gap = 12, gw = w - 2 * m, gh = h - 120;
    const cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
    const selIdx = Math.round(this.sel) - 1;

    PATCHES.forEach((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = m + c * (cw + gap), y = 40 + r * (ch + gap);
      ctx.fillStyle = `rgb(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]})`;
      ctx.fillRect(x, y, cw, ch);
      if (i === selIdx) { ctx.strokeStyle = theme.gold; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4); }
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, x + 5, y + 14);
    });

    const p = PATCHES[selIdx];
    ctx.fillStyle = theme.paperBg; ctx.font = '15px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`#${selIdx + 1}  ${p.name}  ·  sRGB ${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}  ·  #${p.rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`, w / 2, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new ColorChecker());
