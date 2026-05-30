import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const COLORS = ['#c2382c', '#3a76a8', '#1a6a3a', '#c8a020', '#7a2880', '#e08840'];
const NAMES = ['Red Library', 'Blue Café', 'Green Park', 'Yellow Bank', 'Purple Hall', 'Orange Mart'];

class Landmark {
  private stage: CanvasStage;
  private n = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 3);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const recall = 0.4 + 0.08 * this.n; // 40% baseline + 8% per landmark

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.n} coloured landmarks · route-recall accuracy ~${(recall * 100).toFixed(0)} %`, M, M);

    // City grid
    const gx = M, gy = M + 40, gw = (w - 2 * M) * 0.6, gh = (h - 2 * M) * 0.7;
    g.fillStyle = '#e8e2d4'; g.fillRect(gx, gy, gw, gh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(gx, gy, gw, gh);
    // Grid streets (5×4 blocks)
    const cols = 5, rows = 4;
    const cellW = gw / cols, cellH = gh / rows;
    g.strokeStyle = '#fff'; g.lineWidth = 4;
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(gx + i * cellW, gy); g.lineTo(gx + i * cellW, gy + gh); g.stroke(); }
    for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(gx, gy + i * cellH); g.lineTo(gx + gw, gy + i * cellH); g.stroke(); }
    // Route (start to end)
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(gx + cellW * 0.5, gy + cellH * 3.5);
    g.lineTo(gx + cellW * 2.5, gy + cellH * 3.5);
    g.lineTo(gx + cellW * 2.5, gy + cellH * 1.5);
    g.lineTo(gx + cellW * 4.5, gy + cellH * 1.5);
    g.lineTo(gx + cellW * 4.5, gy + cellH * 0.5);
    g.stroke(); g.setLineDash([]);
    // Start + End markers
    g.fillStyle = '#1a6a3a'; g.beginPath(); g.arc(gx + cellW * 0.5, gy + cellH * 3.5, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c2382c'; g.beginPath(); g.arc(gx + cellW * 4.5, gy + cellH * 0.5, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('S', gx + cellW * 0.5, gy + cellH * 3.5 + 4);
    g.fillText('E', gx + cellW * 4.5, gy + cellH * 0.5 + 4);

    // Landmark positions along route
    const lmPos = [
      [1.5, 3.5], [2.5, 2.5], [3.5, 1.5], [2.5, 0.5], [4.5, 2.5], [3.5, 0.5],
    ];
    for (let i = 0; i < this.n; i++) {
      const [px, py] = lmPos[i];
      g.fillStyle = COLORS[i];
      g.fillRect(gx + cellW * px - 12, gy + cellH * py - 12, 24, 24);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(gx + cellW * px - 12, gy + cellH * py - 12, 24, 24);
    }

    // Recall chart (right)
    const rx = gx + gw + 30, ry = gy, rw = w - rx - M, rh = gh;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(rx, ry, rw, rh);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('route-recall accuracy vs landmark count', rx + rw / 2, ry - 4);
    const X = (nn: number) => rx + (nn / 6) * rw;
    const Y = (rr: number) => ry + (1 - (rr - 0.3) / 0.7) * rh;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let nn = 0; nn <= 6; nn++) {
      const r0 = 0.4 + 0.08 * nn;
      const x = X(nn), y = Y(r0);
      if (nn === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.n), Y(recall), 5, 0, Math.PI * 2); g.fill();

    // Landmark legend (below chart)
    const ly = ry + rh + 20;
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'left';
    g.fillText('legend', rx, ly);
    for (let i = 0; i < this.n; i++) {
      g.fillStyle = COLORS[i]; g.fillRect(rx, ly + 8 + i * 18, 18, 14);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
      g.fillText(NAMES[i], rx + 24, ly + 18 + i * 18);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Working-memory limit ≈ 7 ± 2 — never use more than ~7 distinct landmark colours on a single map.', M, h - M);
  }
}

new Landmark();
