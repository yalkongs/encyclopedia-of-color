import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PassGrid {
  private stage: CanvasStage;
  private n = 6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 6);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 6; s.value = 6; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const cells = this.n * this.n;
    const space = Math.pow(cells, 5);
    const bits = Math.log2(space);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.n}×${this.n} grid · ${cells} cells · 5-click password space = ${space.toLocaleString()} ≈ ${bits.toFixed(1)} bits entropy`, M, M);

    // Coloured grid
    const gx = M, gy = M + 40, gw = (w - 2 * M) * 0.6, gh = gw;
    const cellSize = gw / this.n;
    let seed = 4242;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
    for (let r = 0; r < this.n; r++) for (let c = 0; c < this.n; c++) {
      const hue = rng() * 360;
      const sat = 0.3 + rng() * 0.5;
      const val = 0.6 + rng() * 0.3;
      g.fillStyle = `hsl(${hue.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(val * 100).toFixed(0)}%)`;
      g.fillRect(gx + c * cellSize, gy + r * cellSize, cellSize - 1, cellSize - 1);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(gx, gy, gw, gh);
    // Sample password clicks (5 dots)
    seed = 99; // independent stream
    const clicks: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      clicks.push([Math.floor(rng() * this.n), Math.floor(rng() * this.n)]);
    }
    for (let i = 0; i < clicks.length; i++) {
      const [cc, rr] = clicks[i];
      const px = gx + cc * cellSize + cellSize / 2;
      const py = gy + rr * cellSize + cellSize / 2;
      g.fillStyle = theme.crimson;
      g.beginPath(); g.arc(px, py, Math.min(cellSize / 4, 14), 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.arc(px, py, Math.min(cellSize / 4, 14), 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 11px serif'; g.textAlign = 'center';
      g.fillText(`${i + 1}`, px, py + 4);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('5-click password sequence', gx + gw / 2, gy + gh + 16);

    // Comparison panel
    const cx = gx + gw + 30, cy = gy;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('comparison', cx, cy);
    const rows = [
      { label: '8-char alphanum', bits: 52.8, recall1y: '~30%' },
      { label: 'PassPoints 5×40 cells', bits: 36.9, recall1y: '~75%' },
      { label: `your grid (${this.n}²)`, bits: bits, recall1y: '~80%' },
      { label: 'PassFaces 4 of 9 faces', bits: 26.6, recall1y: '~90%' },
    ];
    for (let i = 0; i < rows.length; i++) {
      const yy = cy + 24 + i * 60;
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
      g.fillText(rows[i].label, cx, yy);
      g.font = '11px serif'; g.fillStyle = theme.inkAlpha(0.7);
      g.fillText(`entropy: ${rows[i].bits.toFixed(1)} bits`, cx + 12, yy + 16);
      g.fillText(`1-yr recall: ${rows[i].recall1y}`, cx + 12, yy + 30);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Trade-off: graphical passwords gain memorability but lose entropy. Real systems hybridize (FIDO2 + image-based 2FA).', M, h - M);
  }
}

new PassGrid();
