import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TIERS = [
  { label: 'DANGER', word: 'fatal if violated', col: '#c2382c', shape: 'triangle' },
  { label: 'WARNING', word: 'serious injury possible', col: '#e08020', shape: 'triangle' },
  { label: 'CAUTION', word: 'minor injury possible', col: '#d8c020', shape: 'triangle' },
  { label: 'INFO', word: 'mandatory instruction', col: '#1f3a8a', shape: 'square' },
];

class WarningColor {
  private stage: CanvasStage;
  private t = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 1);
    const s = document.getElementById('t') as EncSlider; s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => Math.round(this.t));
    document.addEventListener('reset-params', () => { this.t = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = TIERS[this.t - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`tier: ${sel.label} — ${sel.word} (ANSI Z535)`, M, M);

    // Big sign
    const sx = M + 80, sy = M + 60, sw = 280, sh = 220;
    if (sel.shape === 'triangle') {
      // Header bar
      g.fillStyle = sel.col; g.fillRect(sx, sy, sw, 50);
      g.fillStyle = '#fff'; g.font = 'bold 30px serif'; g.textAlign = 'center';
      g.fillText(sel.label, sx + sw / 2, sy + 36);
      // Triangle pictogram body
      g.fillStyle = '#f0e8d4'; g.fillRect(sx, sy + 50, sw, sh - 50);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 4;
      g.beginPath();
      g.moveTo(sx + sw / 2, sy + 80);
      g.lineTo(sx + sw / 2 - 60, sy + 180);
      g.lineTo(sx + sw / 2 + 60, sy + 180);
      g.closePath(); g.stroke();
      g.fillStyle = '#1a1a1a'; g.font = 'bold 40px serif';
      g.fillText('!', sx + sw / 2, sy + 165);
    } else {
      g.fillStyle = sel.col; g.fillRect(sx, sy, sw, sh);
      g.fillStyle = '#fff'; g.font = 'bold 30px serif'; g.textAlign = 'center';
      g.fillText(sel.label, sx + sw / 2, sy + 50);
      g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.arc(sx + sw / 2, sy + sh / 2 + 20, 50, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 50px serif';
      g.fillText('i', sx + sw / 2, sy + sh / 2 + 40);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    // Tier ladder (right)
    const lx = sx + sw + 30, ly = sy;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('ANSI Z535 / ISO 3864 hazard tiers', lx, ly);
    for (let i = 0; i < TIERS.length; i++) {
      const yy = ly + 24 + i * 50;
      const focus = (i === this.t - 1);
      g.fillStyle = TIERS[i].col; g.fillRect(lx, yy - 14, 28, 28);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(lx, yy - 14, 28, 28);
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 13px serif' : '13px serif'; g.textAlign = 'left';
      g.fillText(TIERS[i].label, lx + 38, yy);
      g.font = '11px serif';
      g.fillText(TIERS[i].word, lx + 38, yy + 16);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Bright safety colours have ≥4.5:1 contrast vs background under any expected lighting (WCAG AAA equivalent).', M, h - M);
  }
}

new WarningColor();
