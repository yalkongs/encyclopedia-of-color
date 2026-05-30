import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const GRADES = [
  { name: 'azurite (cheap)', col: '#3a6090', cost: '0.5 ducats/oz', sig: 'patron skimped — visible blame' },
  { name: 'indigo + smalt', col: '#3a4080', cost: '1.2', sig: 'middle-tier — acceptable but plain' },
  { name: 'lapis ultramarine (3rd wash)', col: '#2a48a0', cost: '3', sig: 'good chapel work' },
  { name: 'lapis ultramarine (1st wash)', col: '#1f30c0', cost: '~9 (more than gold)', sig: 'maximum patron piety' },
];

class VirginBlue {
  private stage: CanvasStage;
  private g = 4;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.g = hydrateNumber('g', 4);
    const s = document.getElementById('g') as EncSlider; s.value = this.g;
    s.addEventListener('input', (e) => { this.g = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('g', () => Math.round(this.g));
    document.addEventListener('reset-params', () => { this.g = 4; s.value = 4; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = GRADES[this.g - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} · ${sel.cost} · ${sel.sig}`, M, M);

    // Madonna scene
    const sx = M, sy = M + 30, sw = (w - 2 * M) * 0.55, sh = h - 2 * M - 70;
    // Dim chapel background (candlelight tone)
    g.fillStyle = '#3a2818'; g.fillRect(sx, sy, sw, sh);
    // Gold-leaf nimbus
    g.fillStyle = '#d8a020';
    g.beginPath(); g.arc(sx + sw / 2, sy + sh * 0.35, 50, 0, Math.PI * 2); g.fill();
    // Face
    g.fillStyle = '#e8c6a8';
    g.beginPath(); g.ellipse(sx + sw / 2, sy + sh * 0.35, 22, 28, 0, 0, Math.PI * 2); g.fill();
    // Mantle (current grade)
    g.fillStyle = sel.col;
    g.beginPath();
    g.moveTo(sx + sw / 2 - 12, sy + sh * 0.42);
    g.lineTo(sx + sw / 2 - 90, sy + sh * 0.95);
    g.lineTo(sx + sw / 2 + 90, sy + sh * 0.95);
    g.lineTo(sx + sw / 2 + 12, sy + sh * 0.42);
    g.closePath(); g.fill();
    // Highlight folds
    g.fillStyle = `rgba(255,255,255,0.18)`;
    g.beginPath();
    g.moveTo(sx + sw / 2 - 60, sy + sh * 0.6);
    g.bezierCurveTo(sx + sw / 2 - 50, sy + sh * 0.7, sx + sw / 2 - 45, sy + sh * 0.85, sx + sw / 2 - 30, sy + sh * 0.92);
    g.lineTo(sx + sw / 2 - 40, sy + sh * 0.92);
    g.bezierCurveTo(sx + sw / 2 - 56, sy + sh * 0.84, sx + sw / 2 - 65, sy + sh * 0.7, sx + sw / 2 - 75, sy + sh * 0.6);
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillStyle = '#ddd';
    g.fillText('Madonna scene (candlelit chapel)', sx + sw / 2, sy + sh - 8);

    // Grade ladder
    const rx = sx + sw + 30, ry = sy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('contracted pigment grade', rx, ry);
    for (let i = 0; i < GRADES.length; i++) {
      const yy = ry + 28 + i * 80;
      const focus = (i === this.g - 1);
      g.fillStyle = GRADES[i].col; g.fillRect(rx, yy - 16, 50, 50);
      g.strokeStyle = focus ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = focus ? 2 : 1;
      g.strokeRect(rx, yy - 16, 50, 50);
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 12px serif' : '12px serif'; g.textAlign = 'left';
      g.fillText(GRADES[i].name, rx + 60, yy);
      g.font = '11px serif';
      g.fillText(GRADES[i].cost, rx + 60, yy + 14);
      g.fillStyle = focus ? theme.crimson : theme.inkAlpha(0.45);
      g.fillText(GRADES[i].sig, rx + 60, yy + 28);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Pinturicchio 1485 chapel contract: "Mary\'s mantle in finest ultramarine, on penalty of 3 ducats per ounce of substitution detected."', M, h - M);
  }
}

new VirginBlue();
