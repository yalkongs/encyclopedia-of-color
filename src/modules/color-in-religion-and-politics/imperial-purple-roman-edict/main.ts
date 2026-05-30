import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const RANKS = [
  { name: 'plebeian citizen', law: 'no purple at all', stripeFrac: 0 },
  { name: 'equestrian (knight)', law: 'thin clavus (~1 finger wide)', stripeFrac: 0.05 },
  { name: 'senator', law: 'broad clavus (~3 fingers)', stripeFrac: 0.15 },
  { name: 'consul / triumphator', law: 'toga picta (full purple with gold embroidery)', stripeFrac: 0.8 },
  { name: 'emperor', law: 'all-purple paludamentum + purple boots', stripeFrac: 1.0 },
];

class ImperialPurple {
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
    const sel = RANKS[this.r - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} · law: ${sel.law}`, M, M);

    // Toga figure (large)
    const fx = M + 40, fy = M + 60, fw = 200, fh = h - 2 * M - 110;
    // Head
    g.fillStyle = '#e8c6a8';
    g.beginPath(); g.arc(fx + fw / 2, fy + 20, 22, 0, Math.PI * 2); g.fill();
    // Toga (off-white)
    g.fillStyle = '#f0e8d4';
    g.beginPath();
    g.moveTo(fx + fw / 2 - 80, fy + fh);
    g.lineTo(fx + fw / 2 - 60, fy + 50);
    g.lineTo(fx + fw / 2 - 30, fy + 40);
    g.lineTo(fx + fw / 2 + 30, fy + 40);
    g.lineTo(fx + fw / 2 + 60, fy + 50);
    g.lineTo(fx + fw / 2 + 80, fy + fh);
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // Purple clavus stripe down the right shoulder
    if (sel.stripeFrac > 0 && sel.stripeFrac < 0.6) {
      g.fillStyle = '#5a2a82';
      const stripeWidth = sel.stripeFrac * fw;
      g.fillRect(fx + fw / 2 + 20, fy + 50, stripeWidth, fh - 60);
    }
    // Full purple toga (toga picta or emperor)
    if (sel.stripeFrac >= 0.6) {
      g.fillStyle = '#5a2a82';
      g.beginPath();
      g.moveTo(fx + fw / 2 - 80, fy + fh);
      g.lineTo(fx + fw / 2 - 60, fy + 50);
      g.lineTo(fx + fw / 2 - 30, fy + 40);
      g.lineTo(fx + fw / 2 + 30, fy + 40);
      g.lineTo(fx + fw / 2 + 60, fy + 50);
      g.lineTo(fx + fw / 2 + 80, fy + fh);
      g.closePath(); g.fill();
      // Gold embroidery (consul = picta)
      if (sel.stripeFrac < 1.0) {
        g.strokeStyle = '#d8a020'; g.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          g.beginPath(); g.moveTo(fx + fw / 2 - 50, fy + 80 + k * 30); g.lineTo(fx + fw / 2 + 50, fy + 90 + k * 30); g.stroke();
        }
      }
      // Emperor purple boots
      if (sel.stripeFrac === 1) {
        g.fillStyle = '#3a1a52';
        g.fillRect(fx + fw / 2 - 50, fy + fh, 30, 20);
        g.fillRect(fx + fw / 2 + 20, fy + fh, 30, 20);
      }
    }

    // Right column: rank ladder
    const sx = fx + fw + 60, sy = M + 60;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Roman sumptuary ladder', sx, sy);

    for (let i = 0; i < RANKS.length; i++) {
      const yy = sy + 20 + i * 50;
      const focus = (i === this.r - 1);
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 12px serif' : '12px serif'; g.textAlign = 'left';
      g.fillText(`${i + 1}. ${RANKS[i].name}`, sx, yy);
      g.font = '11px serif';
      g.fillText(RANKS[i].law, sx + 12, yy + 14);
      // Mini stripe
      if (RANKS[i].stripeFrac > 0) {
        g.fillStyle = '#5a2a82';
        g.fillRect(sx + 280, yy - 10, 24, 24);
        if (RANKS[i].stripeFrac < 0.6) {
          g.fillStyle = '#f0e8d4';
          g.fillRect(sx + 280, yy - 10, 24 * (1 - RANKS[i].stripeFrac), 24);
        }
        g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 280, yy - 10, 24, 24);
      }
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('"Born in the purple" (porphyrogenitus): Byzantine emperors\' children delivered in a porphyry-walled chamber to qualify for succession.', M, h - M);
  }
}

new ImperialPurple();
