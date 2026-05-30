import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// per-profile small offsets vs a neutral baseline (approximate, illustrative)
const PROFILES = {
  swop:  { name: 'SWOP3 (US web offset, coated)', paper: [248, 247, 240], shift: [ 0,  0,  0] },
  fogra: { name: 'FOGRA39 (Euro sheet-fed, coated)', paper: [244, 245, 245], shift: [-4, -2,  6] },
} as const;
// six representative patches as approximate sRGB triplets at 1× delta
const PATCHES = [
  { name: 'C solid',  rgb: [  0, 159, 218] },
  { name: 'M solid',  rgb: [232,   0, 138] },
  { name: 'Y solid',  rgb: [254, 221,   0] },
  { name: 'K solid',  rgb: [ 30,  30,  30] },
  { name: 'M+Y red',  rgb: [228,  41,  29] },
  { name: 'C+Y green',rgb: [  0, 153,  92] },
];

function rgb(c: number[]): string { return `rgb(${Math.max(0, Math.min(255, c[0] | 0))},${Math.max(0, Math.min(255, c[1] | 0))},${Math.max(0, Math.min(255, c[2] | 0))})`; }
function de(a: number[], b: number[]): number { return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 2.55; }

class SwopFogra {
  private stage: CanvasStage;
  private exag = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.exag = hydrateNumber('exag', 3);
    const s = document.getElementById('exag') as EncSlider;
    s.value = this.exag;
    s.addEventListener('input', (e) => { this.exag = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('exag', () => Math.round(this.exag));
    document.addEventListener('reset-params', () => { this.exag = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  private renderProfile(p: 'swop' | 'fogra', baseRgb: number[]): number[] {
    const sh = PROFILES[p].shift;
    return [baseRgb[0] + sh[0] * this.exag, baseRgb[1] + sh[1] * this.exag, baseRgb[2] + sh[2] * this.exag];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const pad = 40, colW = (w - pad * 3) / 2, colY = 56, rows = PATCHES.length + 1;
    const rowH = Math.min(50, (h - colY - 90) / rows);

    (['swop', 'fogra'] as const).forEach((key, idx) => {
      const x = pad + idx * (colW + pad);
      const paper = this.renderProfile(key, PROFILES[key].paper as unknown as number[]);
      ctx.fillStyle = theme.ink; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(PROFILES[key].name, x, colY - 12);
      // paper white swatch
      ctx.fillStyle = rgb(paper); ctx.fillRect(x, colY, colW, rowH - 6);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x, colY, colW, rowH - 6);
      ctx.fillStyle = theme.ink; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('paper', x + 6, colY + 14);
      ctx.fillStyle = theme.inkSoft; ctx.textAlign = 'right';
      ctx.fillText(`rgb(${paper.map((v) => Math.round(v)).join(',')})`, x + colW - 6, colY + 14);
      // patches
      PATCHES.forEach((pt, i) => {
        const y = colY + (i + 1) * rowH;
        const c = this.renderProfile(key, pt.rgb);
        ctx.fillStyle = rgb(c); ctx.fillRect(x, y, colW * 0.55, rowH - 6);
        ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(x, y, colW * 0.55, rowH - 6);
        ctx.fillStyle = theme.ink; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(pt.name, x + colW * 0.58, y + rowH / 2 - 2);
        // ΔE vs SWOP baseline (for FOGRA column)
        if (key === 'fogra') {
          const swopC = this.renderProfile('swop', pt.rgb);
          ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
          ctx.fillText(`Δ ${de(c, swopC).toFixed(1)}`, x + colW - 6, y + rowH / 2 - 2);
        }
      });
    });

    // paper-white numeric anchor
    const swopP = this.renderProfile('swop', PROFILES.swop.paper as unknown as number[]);
    const fogP = this.renderProfile('fogra', PROFILES.fogra.paper as unknown as number[]);
    const dePaper = de(swopP, fogP);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`exaggeration ${this.exag}× · paper-white ΔE ≈ ${dePaper.toFixed(1)} (FOGRA paper a hair cooler) · CMY solids drift a few ΔE`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new SwopFogra());
