import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const RANKS = [
  { name: 'priest', cassock: '#1a1a1a', sash: '#1a1a1a', meaning: 'simple black' },
  { name: 'bishop', cassock: '#5a2a82', sash: '#5a2a82', meaning: 'violet — penance & sovereignty' },
  { name: 'cardinal', cassock: '#a82828', sash: '#a82828', meaning: 'scarlet — willingness to die for Christ' },
  { name: 'pope', cassock: '#f8f4ec', sash: '#f8f4ec', meaning: 'white — purity & shepherd' },
];

class CardinalRed {
  private stage: CanvasStage;
  private r = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.r = hydrateNumber('r', 3);
    const s = document.getElementById('r') as EncSlider; s.value = this.r;
    s.addEventListener('input', (e) => { this.r = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('r', () => Math.round(this.r));
    document.addEventListener('reset-params', () => { this.r = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = RANKS[this.r - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} · ${sel.meaning}`, M, M);

    // Figure
    const fx = M + 80, fy = M + 60, fw = 180, fh = h - 2 * M - 110;
    // Head
    g.fillStyle = '#e8c6a8';
    g.beginPath(); g.arc(fx + fw / 2, fy + 20, 22, 0, Math.PI * 2); g.fill();
    // Zucchetto (skullcap)
    g.fillStyle = sel.cassock;
    g.beginPath(); g.arc(fx + fw / 2, fy + 8, 18, Math.PI, 0); g.fill();
    // Cassock
    g.fillStyle = sel.cassock;
    g.beginPath();
    g.moveTo(fx + fw / 2 - 60, fy + fh);
    g.lineTo(fx + fw / 2 - 35, fy + 50);
    g.lineTo(fx + fw / 2 - 18, fy + 42);
    g.lineTo(fx + fw / 2 + 18, fy + 42);
    g.lineTo(fx + fw / 2 + 35, fy + 50);
    g.lineTo(fx + fw / 2 + 60, fy + fh);
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    // Buttons row down centre
    g.fillStyle = sel.name === 'pope' ? '#d8a020' : '#1a1a1a';
    for (let k = 0; k < 14; k++) {
      g.beginPath(); g.arc(fx + fw / 2, fy + 60 + k * (fh - 80) / 14, 2.5, 0, Math.PI * 2); g.fill();
    }
    // Sash (fascia)
    g.fillStyle = sel.sash;
    g.fillRect(fx + fw / 2 - 60, fy + 110, 120, 14);

    // Cardinal hat (galero) for cardinal
    if (sel.name === 'cardinal') {
      g.fillStyle = '#a82828';
      g.beginPath();
      g.ellipse(fx + fw / 2, fy + 10, 50, 12, 0, 0, Math.PI * 2);
      g.fill();
      // tassels
      for (let k = 0; k < 4; k++) {
        const tx = fx + fw / 2 - 45 + k * 30;
        g.beginPath(); g.moveTo(tx, fy + 16); g.lineTo(tx - 4, fy + 28); g.lineTo(tx + 4, fy + 28); g.closePath(); g.fill();
      }
    }

    // Rank ladder
    const sx = fx + fw + 60, sy = M + 60;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Catholic vesture by rank', sx, sy);
    for (let i = 0; i < RANKS.length; i++) {
      const yy = sy + 24 + i * 50;
      const focus = (i === this.r - 1);
      // Swatch
      g.fillStyle = RANKS[i].cassock; g.fillRect(sx, yy - 14, 24, 24);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, yy - 14, 24, 24);
      // Label
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 12px serif' : '12px serif'; g.textAlign = 'left';
      g.fillText(RANKS[i].name, sx + 32, yy);
      g.font = '11px serif';
      g.fillText(RANKS[i].meaning, sx + 32, yy + 14);
    }

    // Liturgical season palette
    const ly = sy + 240;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('liturgical-season palette', sx, ly);
    const seasons = [
      { c: '#f8f4ec', n: 'Easter/Christmas (white)' },
      { c: '#a82828', n: 'Pentecost/martyrs (red)' },
      { c: '#1a6a3a', n: 'ordinary time (green)' },
      { c: '#5a2a82', n: 'Lent/Advent (violet)' },
      { c: '#e8a8c0', n: 'Gaudete/Laetare (rose)' },
    ];
    for (let i = 0; i < seasons.length; i++) {
      const yy = ly + 20 + i * 22;
      g.fillStyle = seasons[i].c; g.fillRect(sx, yy - 12, 20, 18);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(sx, yy - 12, 20, 18);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
      g.fillText(seasons[i].n, sx + 28, yy);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('1464 switch from purple to crimson followed Constantinople\'s fall: Tyrian Murex supply dried up, kermes was the most prestigious affordable substitute.', M, h - M);
  }
}

new CardinalRed();
