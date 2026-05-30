import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { drawHexRing } from '@core/render/molecular';

type Phase = 'before' | 'after';
type Dye = 'methyl-orange' | 'congo-red' | 'sudan-I';
const DYES: Dye[] = ['methyl-orange', 'congo-red', 'sudan-I'];
const DYE_INFO: Record<Dye, { name: string; lambdaMax: number; rgb: [number, number, number]; diazo: string; coupler: string }> = {
  'methyl-orange': { name: 'methyl orange',  lambdaMax: 464, rgb: [240, 170, 60],  diazo: 'sulphanilic acid', coupler: 'N,N-dimethylaniline' },
  'congo-red':     { name: 'congo red',       lambdaMax: 497, rgb: [200, 25, 60],   diazo: 'benzidine·2',      coupler: 'naphthionic acid' },
  'sudan-I':       { name: 'Sudan I',         lambdaMax: 480, rgb: [225, 105, 35],  diazo: 'aniline',          coupler: 'β-naphthol' },
};

class AzoCoupling {
  private stage: CanvasStage;
  private phase: Phase = 'after';
  private dye: Dye = 'methyl-orange';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const rp = hydrateFromUrl('phase');
    if (rp === 'before' || rp === 'after') this.phase = rp;
    const rd = hydrateFromUrl('dye');
    if (rd && (DYES as string[]).includes(rd)) this.dye = rd as Dye;
    const tP = document.getElementById('phase') as EncToggle; tP.value = this.phase;
    tP.addEventListener('change', (e) => { this.phase = (e as CustomEvent).detail.value as Phase; this.draw(); notifyStateChange(); });
    const tD = document.getElementById('dye') as EncToggle; tD.value = this.dye;
    tD.addEventListener('change', (e) => { this.dye = (e as CustomEvent).detail.value as Dye; this.draw(); notifyStateChange(); });
    registerStateParam('phase', () => this.phase);
    registerStateParam('dye', () => this.dye);
    document.addEventListener('reset-params', () => { this.phase = 'after'; this.dye = 'methyl-orange'; tP.value = 'after'; tD.value = 'methyl-orange'; this.draw(); notifyStateChange(); });
  }

  private drawNN(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.5;
    // Two parallel lines for N=N
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len * 4, ny = dx / len * 4;
    g.beginPath();
    g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1 + nx, y1 + ny);
    g.moveTo(x0 - nx, y0 - ny); g.lineTo(x1 - nx, y1 - ny);
    g.stroke();
    // N labels
    g.fillStyle = '#dbe7ee'; g.beginPath(); g.arc(x0, y0, 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.arc(x1, y1, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#1a1a1a'; g.font = '10px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', x0, y0);
    g.fillText('N', x1, y1);
    g.textBaseline = 'alphabetic';
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const info = DYE_INFO[this.dye];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${info.name} · λ_max = ${info.lambdaMax} nm`, M, M);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(`diazo: ${info.diazo}    coupler: ${info.coupler}`, M, M + 16);

    // Reaction scheme
    const ry = M + 70;
    const R = 30;
    if (this.phase === 'before') {
      // Two separate species: Ar-N2+ and Ar'-H
      drawHexRing(g, M + 80, ry + 40, R);
      g.fillStyle = '#1a1a1a'; g.font = '11px serif'; g.textAlign = 'left';
      g.fillText('N₂⁺', M + 80 + R + 4, ry + 40);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
      g.fillText('diazonium electrophile', M + 50, ry + 90);

      // Arrow
      g.strokeStyle = theme.crimson; g.lineWidth = 2;
      g.beginPath(); g.moveTo(M + 180, ry + 40); g.lineTo(M + 250, ry + 40);
      g.lineTo(M + 244, ry + 36); g.moveTo(M + 250, ry + 40); g.lineTo(M + 244, ry + 44); g.stroke();
      g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText('+', M + 215, ry + 32);

      // Coupler ring with –OH or –NR2 at the para
      drawHexRing(g, M + 320, ry + 40, R);
      g.fillStyle = '#1a1a1a'; g.font = '11px serif'; g.textAlign = 'left';
      g.fillText('OH', M + 320 + R + 4, ry + 40);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
      g.fillText('electron-rich coupler', M + 280, ry + 90);

      g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
      g.fillText('product not yet formed — colourless solution', M + 420, ry + 30);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
      g.fillText('the diazonium ion is electrophilic and survives only briefly at 0 °C', M + 420, ry + 50);
      g.fillText('NaNO₂ + HCl + ArNH₂ → Ar-N₂⁺ at 0–5 °C', M + 420, ry + 70);
    } else {
      // Coupled product: Ar - N=N - Ar' (chain across the canvas)
      const x1 = M + 80, x2 = M + 320;
      drawHexRing(g, x1, ry + 40, R);
      drawHexRing(g, x2, ry + 40, R);
      // Substituents on para of each ring
      g.fillStyle = '#1a1a1a'; g.font = '11px serif'; g.textAlign = 'right';
      g.fillText('R₁', x1 - R - 4, ry + 44);
      g.textAlign = 'left';
      g.fillText('R₂', x2 + R + 4, ry + 44);
      // The N=N bridge
      this.drawNN(g, x1 + R, ry + 40, x2 - R, ry + 40);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('N=N (azo bridge)', (x1 + x2) / 2, ry + 28);
      g.fillText('extended conjugation = deep colour', (x1 + x2) / 2, ry + 95);

      // Big swatch
      g.fillStyle = `rgb(${info.rgb[0]},${info.rgb[1]},${info.rgb[2]})`;
      g.fillRect(M + 460, ry + 10, 120, 80);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 460, ry + 10, 120, 80);
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
      g.fillText('product colour', M + 520, ry + 105);
    }

    // Bottom: 3 famous-dye swatches with measured λ_max
    const sy = ry + 160;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('famous azo dyes (measured λ_max):', M, sy);
    let cx = M;
    for (const k of DYES) {
      const info2 = DYE_INFO[k];
      g.fillStyle = `rgb(${info2.rgb[0]},${info2.rgb[1]},${info2.rgb[2]})`;
      g.fillRect(cx, sy + 14, 140, 60);
      g.strokeStyle = k === this.dye ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = k === this.dye ? 2 : 1;
      g.strokeRect(cx, sy + 14, 140, 60);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(info2.name, cx + 70, sy + 88);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px monospace';
      g.fillText(`λ_max ${info2.lambdaMax} nm`, cx + 70, sy + 102);
      cx += 160;
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Azo dyes are >60% of all synthetic dyes industrially. The reaction is the single most-used step in colour chemistry — para-attack respected by NMR.', M, h - M);
  }
}

new AzoCoupling();
