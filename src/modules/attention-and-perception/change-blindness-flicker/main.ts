import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ChangeBlind {
  private stage: CanvasStage;
  private b = 80;
  private animFrame = 0;
  private animTimer: number | null = null;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.b = hydrateNumber('b', 80);
    const s = document.getElementById('b') as EncSlider; s.value = this.b;
    s.addEventListener('input', (e) => { this.b = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('b', () => Math.round(this.b));
    document.addEventListener('reset-params', () => { this.b = 80; s.value = 80; this.draw(); notifyStateChange(); });
    // Start animation loop
    if (this.animTimer === null) this.animTimer = window.setInterval(() => { this.animFrame++; this.draw(); }, 200);
  }

  private drawScene(g: CanvasRenderingContext2D, x: number, y: number, ww: number, hh: number, variant: 'A' | 'B') {
    g.fillStyle = '#3a4a6a'; g.fillRect(x, y, ww, hh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(x, y, ww, hh);
    // Office desk
    g.fillStyle = '#6a4a30'; g.fillRect(x + 10, y + hh - 50, ww - 20, 30);
    // Lamp
    const lampCol = variant === 'A' ? '#c2382c' : '#c8a020';
    g.fillStyle = lampCol;
    g.beginPath();
    g.moveTo(x + 40, y + hh - 80);
    g.lineTo(x + 30, y + hh - 50);
    g.lineTo(x + 60, y + hh - 50);
    g.closePath(); g.fill();
    g.fillStyle = '#aaaaaa'; g.fillRect(x + 42, y + hh - 60, 6, 10);
    // Book stack
    g.fillStyle = '#1a6a3a'; g.fillRect(x + 90, y + hh - 70, 30, 15);
    g.fillStyle = '#5a2a82'; g.fillRect(x + 90, y + hh - 55, 30, 12);
    g.fillStyle = '#c2382c'; g.fillRect(x + 90, y + hh - 43, 30, 15);
    // Picture frame on wall
    const frameCol = variant === 'A' ? '#d8a020' : '#a8a8a8';
    g.fillStyle = frameCol; g.fillRect(x + 150, y + 30, 60, 40);
    g.fillStyle = '#88aacc'; g.fillRect(x + 154, y + 34, 52, 32);
    // Mug
    g.fillStyle = '#f0f0f0'; g.fillRect(x + 180, y + hh - 60, 18, 22);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const cycleTime = 200 + this.b; // a–blank–b–blank
    const phase = this.animFrame % 4;
    let scene: 'A' | 'blank' | 'B' = 'A';
    if (phase === 0) scene = 'A';
    else if (phase === 1) scene = 'blank';
    else if (phase === 2) scene = 'B';
    else scene = 'blank';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`blank = ${this.b} ms · cycle ≈ ${cycleTime * 2} ms (flicker)`, M, M);

    const sx = M, sy = M + 40, sw = w - 2 * M, sh = (h - 2 * M) * 0.55;
    if (scene === 'blank') {
      g.fillStyle = '#888'; g.fillRect(sx, sy, sw, sh);
    } else {
      this.drawScene(g, sx, sy, sw, sh, scene);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`current: ${scene === 'blank' ? '(blank)' : 'image ' + scene}`, sx + sw / 2, sy + sh + 16);

    // Annotation panel
    const ay = sy + sh + 40;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Two changes between A and B:', M, ay);
    g.font = '12px serif'; g.fillStyle = theme.inkAlpha(0.85);
    g.fillText('1. Lamp colour: red (A) ↔ yellow (B)', M + 14, ay + 18);
    g.fillText('2. Picture frame: gold (A) ↔ silver (B)', M + 14, ay + 36);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('Without the blank, motion would make the change obvious. With the blank, you must hunt — sometimes 30 s+.', M + 14, ay + 58);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Used in safety: NHTSA studies show drivers fail to notice large changes in adjacent lanes after a brief glance away.', M, h - M);
  }
}

new ChangeBlind();
