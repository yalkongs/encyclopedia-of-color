import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface AzoDye {
  name: string;
  donor: string;
  acceptor: string;
  lmax: number;
  col: string;
}

const DYES: AzoDye[] = [
  { name: 'Aniline yellow', donor: 'H', acceptor: 'NH₂', lmax: 410, col: '#d8c020' },
  { name: 'Methyl orange', donor: 'N(CH₃)₂', acceptor: 'SO₃⁻', lmax: 465, col: '#e08a30' },
  { name: 'Sudan III', donor: '–', acceptor: 'OH', lmax: 510, col: '#c83820' },
  { name: 'Congo red', donor: 'NH₂', acceptor: 'SO₃⁻', lmax: 540, col: '#b82838' },
  { name: 'Disperse Red 1', donor: 'N(CH₃)₂', acceptor: 'NO₂', lmax: 555, col: '#a82856' },
  { name: 'Acid violet 7', donor: 'OH/NH₂', acceptor: 'SO₃⁻', lmax: 580, col: '#7a2880' },
];

class Azo {
  private stage: CanvasStage;
  private i = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.i = hydrateNumber('i', 3);
    const s = document.getElementById('i') as EncSlider; s.value = this.i;
    s.addEventListener('input', (e) => { this.i = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('i', () => Math.round(this.i));
    document.addEventListener('reset-params', () => { this.i = 3; s.value = 3; this.draw(); notifyStateChange(); });
  }

  private drawRing(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const d = DYES[this.i - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${d.name} · λmax ≈ ${d.lmax} nm · donor=${d.donor} acceptor=${d.acceptor}`, M, M);

    // Cloth swatch
    const cx = M, cy = M + 30, cw = 280, ch = 280;
    g.fillStyle = d.col; g.fillRect(cx, cy, cw, ch);
    g.strokeStyle = 'rgba(0,0,0,0.1)';
    for (let k = 0; k < cw; k += 4) { g.beginPath(); g.moveTo(cx + k, cy); g.lineTo(cx + k, cy + ch); g.stroke(); }
    for (let k = 0; k < ch; k += 4) { g.beginPath(); g.moveTo(cx, cy + k); g.lineTo(cx + cw, cy + k); g.stroke(); }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(cx, cy, cw, ch);

    // Structure schematic to the right
    const sx = cx + cw + 30, sy = cy + 60;
    g.strokeStyle = theme.ink; g.lineWidth = 1.5;
    this.drawRing(g, sx + 30, sy, 22); g.stroke();
    this.drawRing(g, sx + 180, sy, 22); g.stroke();
    // N=N bridge
    g.beginPath(); g.moveTo(sx + 52, sy); g.lineTo(sx + 90, sy); g.stroke();
    g.beginPath(); g.moveTo(sx + 90, sy - 2); g.lineTo(sx + 130, sy - 2); g.stroke();
    g.beginPath(); g.moveTo(sx + 90, sy + 2); g.lineTo(sx + 130, sy + 2); g.stroke();
    g.beginPath(); g.moveTo(sx + 130, sy); g.lineTo(sx + 158, sy); g.stroke();
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('N=N', sx + 90 + 20, sy - 8);

    // Donor / acceptor labels
    g.fillStyle = '#1a6a3a'; g.font = '11px serif';
    g.fillText(d.donor, sx + 30, sy + 36);
    g.fillText('donor', sx + 30, sy + 50);
    g.fillStyle = theme.crimson;
    g.fillText(d.acceptor, sx + 180, sy + 36);
    g.fillText('acceptor', sx + 180, sy + 50);

    // λ axis at the bottom
    const ax = M, ay = h - M - 50, aw = w - 2 * M;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + aw, ay); g.stroke();
    // gradient under the line (visible-spectrum)
    for (let k = 0; k < aw; k++) {
      const lam = 380 + (k / aw) * (700 - 380);
      g.fillStyle = `hsl(${300 - (lam - 380) * (300 / 320)} 80% 50%)`;
      g.fillRect(ax + k, ay + 2, 1, 14);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('380 nm', ax, ay + 30);
    g.textAlign = 'right'; g.fillText('700 nm', ax + aw, ay + 30);
    // Marker for λmax
    const mx = ax + ((d.lmax - 380) / 320) * aw;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath(); g.moveTo(mx, ay - 10); g.lineTo(mx, ay + 22); g.stroke();
    g.fillStyle = theme.crimson; g.textAlign = 'center'; g.font = '11px serif';
    g.fillText(`λmax ${d.lmax} nm`, mx, ay - 14);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Azo dyes are ~70% of all industrial dye production. Same N=N reaction, dozens of donor-acceptor pairs → any shade.', M, h - M);
  }
}

new Azo();
