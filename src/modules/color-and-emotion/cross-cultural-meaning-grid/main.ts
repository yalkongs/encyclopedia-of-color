import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const REGIONS = ['East Asia', 'South Asia', 'Western Europe', 'Latin America', 'Sub-Saharan Africa', 'Middle East'];
const COLORS = [
  { name: 'red', hex: '#c2382c' },
  { name: 'yellow', hex: '#c8a020' },
  { name: 'green', hex: '#1a6a3a' },
  { name: 'blue', hex: '#1f3a8a' },
  { name: 'white', hex: '#f0f0f0' },
  { name: 'black', hex: '#1a1a1a' },
];
const MEANINGS: string[][] = [
  // E Asia
  ['fortune, weddings', 'royalty, courage', 'youth, vigour', 'immortality', 'mourning, death', 'darkness, evil'],
  // S Asia
  ['marriage, sindoor', 'sacred, saffron', 'Islam, paradise', 'Krishna, divinity', 'mourning (widow)', 'evil, mourning'],
  // Western Europe
  ['danger, love', 'cowardice, caution', 'envy, nature', 'trust, calm', 'purity, weddings', 'death, formal'],
  // Latin America
  ['passion, blood', 'mourning (in some)', 'death (in some)', 'religion', 'peace, hope', 'death, mourning'],
  // Sub-Saharan Africa
  ['life, mourning (some)', 'wealth, prestige', 'fertility, life', 'love (some)', 'purity, joy', 'maturity, mourning'],
  // Middle East
  ['danger, vigor', 'happiness', 'Islam, prophet', 'safety, divine', 'purity, mourning', 'mourning, evil'],
];

class CrossCultural {
  private stage: CanvasStage;
  private r = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.r = hydrateNumber('r', 1);
    const s = document.getElementById('r') as EncSlider; s.value = this.r;
    s.addEventListener('input', (e) => { this.r = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('r', () => Math.round(this.r));
    document.addEventListener('reset-params', () => { this.r = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`region: ${REGIONS[this.r - 1]} (highlighted row)`, M, M);

    // 6×6 grid: rows = region, cols = colour
    const gx = M + 130, gy = M + 50;
    const cellW = (w - gx - M) / 6;
    const cellH = 60;
    // Column headers (colours)
    for (let c = 0; c < 6; c++) {
      const cx = gx + c * cellW;
      g.fillStyle = COLORS[c].hex;
      g.fillRect(cx + 4, gy - 36, cellW - 8, 28);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(cx + 4, gy - 36, cellW - 8, 28);
      g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'center';
      g.fillText(COLORS[c].name, cx + cellW / 2, gy - 14);
    }
    // Row labels + cells
    for (let r = 0; r < 6; r++) {
      const ry = gy + r * cellH;
      const focus = (r === this.r - 1);
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.5);
      g.font = focus ? 'bold 11px serif' : '11px serif'; g.textAlign = 'right';
      g.fillText(REGIONS[r], gx - 8, ry + cellH / 2 + 4);
      if (focus) {
        g.fillStyle = 'rgba(255,180,0,0.08)';
        g.fillRect(gx, ry, cellW * 6, cellH);
      }
      for (let c = 0; c < 6; c++) {
        const cx = gx + c * cellW;
        g.strokeStyle = theme.inkAlpha(focus ? 0.7 : 0.3); g.lineWidth = focus ? 1.5 : 1;
        g.strokeRect(cx, ry, cellW, cellH);
        g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
        g.font = focus ? 'bold 10px serif' : '10px serif'; g.textAlign = 'center';
        const txt = MEANINGS[r][c];
        const words = txt.split(' ');
        let line = '', y0 = ry + 18;
        for (const wd of words) {
          if ((line + ' ' + wd).length > 18) { g.fillText(line, cx + cellW / 2, y0); y0 += 12; line = wd; }
          else line = line ? line + ' ' + wd : wd;
        }
        if (line) g.fillText(line, cx + cellW / 2, y0);
      }
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Aslam (2006) surveyed colour meaning across 35 countries — universals exist but specific symbolism varies widely.', M, h - M);
  }
}

new CrossCultural();
