import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Madder {
  private stage: CanvasStage;
  private m = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.m = hydrateNumber('m', 1);
    const s = document.getElementById('m') as EncSlider; s.value = this.m;
    s.addEventListener('input', (e) => { this.m = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('m', () => Math.round(this.m));
    document.addEventListener('reset-params', () => { this.m = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const mordants = [
      { name: 'Al³⁺ alum — Turkey red', col: '#c2382c', metal: 'Al' },
      { name: 'Fe²⁺ ferrous sulfate — aubergine', col: '#4a1f2e', metal: 'Fe' },
      { name: 'Cr³⁺ chromium — garnet brown', col: '#7a2018', metal: 'Cr' },
    ];
    const sel = mordants[this.m - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Madder + ${sel.name}`, M, M);

    // Cloth swatch (large)
    const cx = M, cy = M + 30, cw = (w - 2 * M) * 0.45, ch = h - 2 * M - 60;
    g.fillStyle = sel.col; g.fillRect(cx, cy, cw, ch);
    // weave texture
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
    for (let i = 0; i < cw; i += 4) { g.beginPath(); g.moveTo(cx + i, cy); g.lineTo(cx + i, cy + ch); g.stroke(); }
    for (let j = 0; j < ch; j += 4) { g.beginPath(); g.moveTo(cx, cy + j); g.lineTo(cx + cw, cy + j); g.stroke(); }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(cx, cy, cw, ch);

    // Chemistry schematic (right) — alizarin-metal complex
    const sx = cx + cw + 30, sy = cy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('alizarin–metal complex', sx, sy);

    // Anthraquinone fused rings (very schematic)
    const drawRing = (rx: number, ry: number) => {
      g.strokeStyle = theme.ink; g.lineWidth = 1.5;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 - Math.PI / 6;
        const px = rx + Math.cos(a) * 16, py = ry + Math.sin(a) * 16;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.stroke();
    };
    drawRing(sx + 25, sy + 50);
    drawRing(sx + 55, sy + 50);
    drawRing(sx + 85, sy + 50);
    // Carbonyl C=O (above)
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('O', sx + 55, sy + 30);
    g.fillText('O', sx + 55, sy + 78);
    // Hydroxyls on left ring
    g.fillStyle = theme.crimson;
    g.fillText('OH', sx + 5, sy + 50);
    g.fillText('OH', sx + 5, sy + 65);

    // Metal at the centre
    g.fillStyle = sel.col;
    g.beginPath(); g.arc(sx + 30, sy + 90, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 10px serif'; g.textAlign = 'center';
    g.fillText(sel.metal, sx + 30, sy + 93);
    g.strokeStyle = sel.col; g.lineWidth = 1.5; g.setLineDash([2, 2]);
    g.beginPath(); g.moveTo(sx + 12, sy + 60); g.lineTo(sx + 30, sy + 81); g.stroke();
    g.beginPath(); g.moveTo(sx + 12, sy + 70); g.lineTo(sx + 30, sy + 81); g.stroke();
    g.setLineDash([]);

    // Mordant list
    let ly = sy + 160;
    for (const m of mordants) {
      const focus = (mordants.indexOf(m) === this.m - 1);
      g.fillStyle = m.col;
      g.fillRect(sx, ly - 10, 22, 14);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(sx, ly - 10, 22, 14);
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.45);
      g.font = focus ? 'bold 12px serif' : '12px serif'; g.textAlign = 'left';
      g.fillText(m.name, sx + 30, ly);
      ly += 22;
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same dye, different metal — colour follows the metal–dye complex geometry. Synthetic alizarin (1869) crashed the natural madder market in 3 years.', M, h - M);
  }
}

new Madder();
