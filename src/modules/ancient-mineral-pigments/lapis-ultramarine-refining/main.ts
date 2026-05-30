import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const GRADES = [
  { name: 'first wash — Virgin\'s blue', col: '#2440a0', cost: 'ducats/oz: ~9 (1500 CE)', purity: 'highest' },
  { name: 'second wash — middle', col: '#5a6090', cost: '~5', purity: 'medium' },
  { name: 'third wash — ultramarine ash', col: '#8a8aa0', cost: '~1', purity: 'low (often mixed with calcite)' },
];

class Lapis {
  private stage: CanvasStage;
  private w = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.w = hydrateNumber('w', 1);
    const s = document.getElementById('w') as EncSlider; s.value = this.w;
    s.addEventListener('input', (e) => { this.w = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('w', () => Math.round(this.w));
    document.addEventListener('reset-params', () => { this.w = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = GRADES[this.w - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} · purity ${sel.purity} · ${sel.cost}`, M, M);

    // Three pots in a row showing decreasing intensity
    const px = M, py = M + 40, pw = w - 2 * M, ph = 200;
    const potW = (pw - 60) / 3;
    for (let i = 0; i < 3; i++) {
      const x = px + i * (potW + 30);
      const focus = (i === this.w - 1);
      // Pot
      g.fillStyle = '#c8b890';
      g.beginPath();
      g.moveTo(x + 20, py + 30); g.lineTo(x + potW - 20, py + 30);
      g.lineTo(x + potW - 8, py + ph - 30); g.lineTo(x + 8, py + ph - 30); g.closePath(); g.fill();
      g.strokeStyle = theme.inkAlpha(0.6); g.stroke();
      // Liquid
      g.fillStyle = GRADES[i].col;
      g.beginPath();
      g.ellipse(x + potW / 2, py + 38, (potW - 40) / 2, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + 24, py + 38, potW - 48, ph - 80);
      // Front rim
      g.fillStyle = `rgba(0,0,0,0.2)`;
      g.beginPath();
      g.ellipse(x + potW / 2, py + 38, (potW - 40) / 2, 6, 0, 0, Math.PI);
      g.fill();
      // Label
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.5);
      g.font = focus ? 'bold 12px serif' : '12px serif'; g.textAlign = 'center';
      g.fillText(`wash ${i + 1}`, x + potW / 2, py + ph - 8);
      if (focus) {
        g.strokeStyle = theme.crimson; g.lineWidth = 2;
        g.strokeRect(x - 4, py - 4, potW + 8, ph + 8);
      }
    }

    // Mantle swatch (large, current grade)
    const my = py + ph + 30;
    const mxx = M + (w - 2 * M) / 2 - 80;
    g.fillStyle = sel.col; g.fillRect(mxx, my, 160, 80);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(mxx, my, 160, 80);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Virgin\'s mantle if applied here', mxx + 80, my + 100);

    // Sodalite cage schematic
    const cx = M + 30, cy = my + 30;
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1;
    // Hexagonal cage outline
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * 30, y1 = cy + Math.sin(a) * 30;
      const x2 = cx + Math.cos(a + Math.PI / 3) * 30, y2 = cy + Math.sin(a + Math.PI / 3) * 30;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    // S3 radical inside
    g.fillStyle = '#d8d020';
    g.beginPath(); g.arc(cx - 5, cy, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 5, cy - 4, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 5, cy + 4, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.ink; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('S₃⁻ radical', cx, cy + 50);
    g.fillText('in sodalite cage', cx, cy + 64);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Renaissance contracts specified ultramarine by grade — Vasari documented arguments over whether Christ\'s mantle deserved the first wash.', M, h - M);
  }
}

new Lapis();
