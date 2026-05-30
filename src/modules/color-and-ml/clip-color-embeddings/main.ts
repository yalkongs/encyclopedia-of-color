import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Word { name: string; rgb: [number, number, number]; gloss: string; }

const WORDS: Word[] = [
  { name: 'crimson', rgb: [165, 24, 36], gloss: 'deep saturated red' },
  { name: 'cerulean', rgb: [42, 82, 190], gloss: 'sky blue with green tint' },
  { name: 'mauve', rgb: [184, 144, 178], gloss: 'pale purple-pink' },
  { name: 'olive', rgb: [128, 128, 32], gloss: 'dull yellow-green' },
  { name: 'teal', rgb: [0, 128, 128], gloss: 'mid-saturated blue-green' },
  { name: 'sepia', rgb: [112, 66, 20], gloss: 'warm dark brown' },
  { name: 'chartreuse', rgb: [127, 255, 0], gloss: 'electric yellow-green' },
  { name: 'vermilion', rgb: [227, 66, 52], gloss: 'orange-red, HgS mineral' },
];

class CLIPColour {
  private stage: CanvasStage;
  private i = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.i = hydrateNumber('i', 1);
    const s = document.getElementById('i') as EncSlider; s.value = this.i;
    s.addEventListener('input', (e) => { this.i = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('i', () => Math.round(this.i));
    document.addEventListener('reset-params', () => { this.i = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = WORDS[this.i - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`"${sel.name}" — ${sel.gloss}`, M, M);

    // Big swatch
    const sx = M, sy = M + 30, sw = 300, sh = 220;
    g.fillStyle = `rgb(${sel.rgb[0]},${sel.rgb[1]},${sel.rgb[2]})`;
    g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = '#fff'; g.font = 'bold 16px serif'; g.textAlign = 'center';
    g.fillText(`"${sel.name}"`, sx + sw / 2, sy + sh - 12);

    // 2D embedding scatter (a, b axes with words plotted)
    const ex = sx + sw + 30, ey = sy, ew = w - ex - M, eh = 240;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(ex, ey, ew, eh);
    // Axes (centred)
    g.strokeStyle = theme.inkAlpha(0.3); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(ex + ew / 2, ey); g.lineTo(ex + ew / 2, ey + eh); g.stroke();
    g.beginPath(); g.moveTo(ex, ey + eh / 2); g.lineTo(ex + ew, ey + eh / 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('a* (green ↔ red)', ex + ew / 2, ey + eh + 14);
    g.save(); g.translate(ex - 16, ey + eh / 2); g.rotate(-Math.PI / 2);
    g.fillText('b* (blue ↔ yellow)', 0, 0); g.restore();

    // Plot each word using its rgb-derived (a*, b*)
    for (let i = 0; i < WORDS.length; i++) {
      const wd = WORDS[i];
      const [r, gC, b] = wd.rgb;
      // Quick Lab a/b approx
      const a = (r - gC) * 0.6;
      const bC = (gC - b) * 0.6 + 30;
      const px = ex + ew / 2 + (a / 200) * ew;
      const py = ey + eh / 2 - (bC / 200) * eh;
      const focus = (i === this.i - 1);
      g.fillStyle = `rgb(${r},${gC},${b})`;
      g.beginPath(); g.arc(px, py, focus ? 10 : 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = focus ? theme.ink : theme.inkAlpha(0.3); g.lineWidth = focus ? 1.5 : 1;
      g.stroke();
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.6);
      g.font = focus ? 'bold 11px serif' : '10px serif'; g.textAlign = 'center';
      g.fillText(wd.name, px, py - (focus ? 14 : 10));
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('CLIP embeddings cluster colour terms near their visual referents — letting Stable Diffusion match "muted teal" to a specific RGB region.', M, h - M);
  }
}

new CLIPColour();
