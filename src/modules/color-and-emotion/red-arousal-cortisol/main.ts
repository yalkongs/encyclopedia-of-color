import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class RedArousal {
  private stage: CanvasStage;
  private s = 0.7;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.s = hydrateNumber('s', 0.7);
    const sl = document.getElementById('s') as EncSlider; sl.value = this.s;
    sl.addEventListener('input', (e) => { this.s = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('s', () => this.s.toFixed(2));
    document.addEventListener('reset-params', () => { this.s = 0.7; sl.value = 0.7; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const HR0 = 70, HRDelta = 8 * this.s;
    const HR = HR0 + HRDelta;
    const cortBase = 8, cortDelta = 0.5 * this.s;
    const cort = cortBase + cortDelta;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`saturation = ${this.s.toFixed(2)} · HR ${HR.toFixed(0)} bpm (+${HRDelta.toFixed(1)}) · cortisol ${cort.toFixed(2)} μg/dL (+${cortDelta.toFixed(2)})`, M, M);

    // Stimulus swatch
    const sx = M, sy = M + 30, sw = 220, sh = 200;
    const r = Math.round(120 + 130 * this.s);
    const gC = Math.round(120 - 90 * this.s);
    const b = Math.round(120 - 90 * this.s);
    g.fillStyle = `rgb(${r},${gC},${b})`; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = '#fff'; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('stimulus swatch', sx + sw / 2, sy + sh - 12);

    // Heart-rate dial
    const dx = sx + sw + 40, dy = sy + sh / 2, dr = 70;
    g.beginPath(); g.arc(dx, dy, dr, 0, Math.PI * 2); g.fillStyle = '#f3eddf'; g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2; g.stroke();
    // Tick marks 50..120 bpm
    for (let bpm = 50; bpm <= 120; bpm += 10) {
      const angle = -Math.PI / 2 + (bpm - 50) / 70 * Math.PI * 1.5;
      const x1 = dx + Math.cos(angle) * dr * 0.85;
      const y1 = dy + Math.sin(angle) * dr * 0.85;
      const x2 = dx + Math.cos(angle) * dr * 0.95;
      const y2 = dy + Math.sin(angle) * dr * 0.95;
      g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.fillStyle = theme.inkAlpha(0.6); g.font = '9px serif'; g.textAlign = 'center';
      g.fillText(String(bpm), dx + Math.cos(angle) * dr * 0.75, dy + Math.sin(angle) * dr * 0.75 + 3);
    }
    // Needle
    const angleHR = -Math.PI / 2 + (HR - 50) / 70 * Math.PI * 1.5;
    g.strokeStyle = theme.crimson; g.lineWidth = 3;
    g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + Math.cos(angleHR) * dr * 0.75, dy + Math.sin(angleHR) * dr * 0.75); g.stroke();
    g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('heart rate', dx, dy + dr + 18);
    g.font = '18px serif'; g.fillStyle = theme.crimson;
    g.fillText(`${HR.toFixed(0)}`, dx, dy + dr + 40);

    // Cortisol bar
    const cx = dx + dr + 60, cy = sy + 20, cw = 60, ch = sh - 40;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(cx, cy, cw, ch);
    const fillH = ((cort - 5) / 8) * ch;
    g.fillStyle = '#c8a020'; g.fillRect(cx + 4, cy + ch - fillH, cw - 8, fillH);
    g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('cortisol', cx + cw / 2, cy + ch + 18);
    g.font = '14px serif'; g.fillStyle = '#c8a020';
    g.fillText(`${cort.toFixed(2)} μg/dL`, cx + cw / 2, cy + ch + 38);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Effect sizes are real but small (d ~0.2). Replication has been mixed — context (anger vs sex) flips red\'s valence.', M, h - M);
  }
}

new RedArousal();
