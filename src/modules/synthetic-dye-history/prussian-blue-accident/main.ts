import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PrussianBlue {
  private stage: CanvasStage;
  private c = 0.6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 0.6);
    const s = document.getElementById('c') as EncSlider; s.value = this.c;
    s.addEventListener('input', (e) => { this.c = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('c', () => this.c.toFixed(2));
    document.addEventListener('reset-params', () => { this.c = 0.6; s.value = 0.6; this.draw(); notifyStateChange(); });
  }

  private inkColor(c: number): string {
    // Beer-Lambert: base sky #6db8e8 → near-black with rising c
    const k = 3.2;
    const T = Math.exp(-k * c);
    const r = Math.round(0x6d * T + 8 * (1 - T));
    const gC = Math.round(0xb8 * T + 16 * (1 - T));
    const b = Math.round(0xe8 * T + 60 * (1 - T));
    return `rgb(${r},${gC},${b})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.inkColor(this.c);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`loading c = ${this.c.toFixed(2)} · Prussian blue tint = ${col}`, M, M);

    // Hokusai wave silhouette (filled with Prussian blue at current intensity)
    const wx = M, wy = M + 30, ww = (w - 2 * M) * 0.55, wh = h - 2 * M - 60;
    g.fillStyle = '#f3e9d4'; g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(wx, wy, ww, wh);

    // Wave shape
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(wx, wy + wh * 0.7);
    const waveX = (t: number) => wx + t * ww;
    const baseline = wy + wh * 0.7;
    for (let t = 0; t <= 1; t += 0.01) {
      const yy = baseline - Math.sin(t * Math.PI * 2.5) * wh * 0.18 - (t < 0.6 ? 0 : Math.pow((t - 0.6) / 0.4, 2) * wh * 0.5);
      g.lineTo(waveX(t), yy);
    }
    g.lineTo(wx + ww, wy + wh);
    g.lineTo(wx, wy + wh);
    g.closePath();
    g.fill();
    // Foam (white tip)
    g.fillStyle = '#f5f1e5';
    g.beginPath();
    g.moveTo(wx + ww * 0.7, wy + wh * 0.25);
    g.bezierCurveTo(wx + ww * 0.8, wy + wh * 0.1, wx + ww * 0.95, wy + wh * 0.05, wx + ww * 0.98, wy + wh * 0.15);
    g.bezierCurveTo(wx + ww * 0.95, wy + wh * 0.2, wx + ww * 0.85, wy + wh * 0.18, wx + ww * 0.75, wy + wh * 0.28);
    g.closePath(); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Hokusai-style wave (filled with current pigment)', wx + ww / 2, wy + wh + 16);

    // Right: IVCT schematic
    const sx = wx + ww + 40, sy = wy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Fe(II)–CN–Fe(III) charge transfer', sx, sy);

    // Fe2+ and Fe3+ atoms with CN bridge
    const aY = sy + 80;
    g.fillStyle = '#3a76a8';
    g.beginPath(); g.arc(sx + 30, aY, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('Fe²⁺', sx + 30, aY + 4);
    g.fillStyle = '#a82828';
    g.beginPath(); g.arc(sx + 160, aY, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.fillText('Fe³⁺', sx + 160, aY + 4);
    // CN bridge
    g.strokeStyle = theme.ink; g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx + 52, aY); g.lineTo(sx + 138, aY); g.stroke();
    g.fillStyle = theme.ink; g.font = '11px serif';
    g.fillText('C≡N', sx + 95, aY - 8);

    // Electron transfer arrow (curves over)
    g.strokeStyle = theme.crimson; g.lineWidth = 1.5; g.setLineDash([3, 2]);
    g.beginPath();
    g.moveTo(sx + 30, aY - 22);
    g.bezierCurveTo(sx + 50, aY - 60, sx + 140, aY - 60, sx + 160, aY - 22);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.crimson; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('e⁻ transfer · 700 nm absorption', sx + 95, aY - 64);

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('absorbs red (700 nm) → looks deep blue', sx + 95, aY + 50);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Prussian blue (1706) was the first stable modern synthetic colour. Same pigment still in cyanotype prints, oil painting, and Tl/Cs poisoning antidotes.', M, h - M);
  }
}

new PrussianBlue();
