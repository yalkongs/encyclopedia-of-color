import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Dir = 'LMCT' | 'MLCT';
const DIRS: Dir[] = ['LMCT', 'MLCT'];

const EXAMPLES: Record<Dir, { name: string; lambda: number; colour: string }[]> = {
  LMCT: [
    { name: 'KMnO₄ (Mn^VII)', lambda: 525, colour: 'deep purple' },
    { name: '[CrO₄]²⁻ (Cr^VI)', lambda: 370, colour: 'yellow' },
    { name: '[Cr₂O₇]²⁻ (Cr^VI)', lambda: 440, colour: 'orange' },
  ],
  MLCT: [
    { name: '[Ru(bipy)₃]²⁺', lambda: 452, colour: 'orange-red' },
    { name: '[Fe(bipy)₃]²⁺', lambda: 520, colour: 'red-violet' },
    { name: '[W(CO)₆]', lambda: 286, colour: 'colourless (UV)' },
  ],
};

function complementCss(absLambda: number): string {
  if (absLambda < 380) return '#f0eee5';
  const offsetTable: [number, number][] = [
    [400, 580], [430, 600], [450, 580], [490, 620], [520, 640], [550, 410], [580, 450], [610, 480], [640, 490], [700, 510],
  ];
  for (let i = 0; i < offsetTable.length - 1; i++) {
    const [l0, c0] = offsetTable[i], [l1, c1] = offsetTable[i + 1];
    if (absLambda >= l0 && absLambda <= l1) {
      const t = (absLambda - l0) / (l1 - l0);
      return wavelengthCss(c0 + t * (c1 - c0));
    }
  }
  return wavelengthCss(550);
}

class ChargeTransfer {
  private stage: CanvasStage;
  private dir: Dir = 'LMCT';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('dir');
    if (raw && (DIRS as string[]).includes(raw)) this.dir = raw as Dir;
    const t = document.getElementById('dir') as EncToggle; t.value = this.dir;
    t.addEventListener('change', (e) => { this.dir = (e as CustomEvent).detail.value as Dir; this.draw(); notifyStateChange(); });
    registerStateParam('dir', () => this.dir);
    document.addEventListener('reset-params', () => { this.dir = 'LMCT'; t.value = 'LMCT'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.dir} — ${this.dir === 'LMCT' ? 'ligand → metal' : 'metal → ligand'} charge transfer`, M, M);

    // MO diagram: 2 columns (M and L orbitals), arrow between
    const dY = M + 60;
    const dH = 220;
    const mX = M + 110;
    const lX = M + 350;

    // Vertical axis
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
    g.beginPath(); g.moveTo(M + 30, dY); g.lineTo(M + 30, dY + dH); g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.save(); g.translate(M + 15, dY + dH / 2); g.rotate(-Math.PI / 2);
    g.fillText('energy', 0, 0); g.restore();

    const drawLevel = (xC: number, yE: number, label: string, color: string, electrons = 0) => {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.moveTo(xC - 50, yE); g.lineTo(xC + 50, yE); g.stroke();
      g.fillStyle = color; g.font = '11px serif'; g.textAlign = 'right';
      g.fillText(label, xC - 56, yE + 4);
      // Electron arrows
      for (let i = 0; i < electrons; i++) {
        const ex = xC - 14 + i * 14;
        g.strokeStyle = '#1a1a1a';
        g.beginPath(); g.moveTo(ex, yE + 6); g.lineTo(ex, yE - 6); g.stroke();
        g.beginPath(); g.moveTo(ex, yE - 6); g.lineTo(ex - 2, yE - 4); g.moveTo(ex, yE - 6); g.lineTo(ex + 2, yE - 4); g.stroke();
      }
    };

    // Metal levels (left)
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('metal (M)', mX, dY - 6);
    g.fillText('ligand (L)', lX, dY - 6);
    // For LMCT: metal LUMO is *lower* than ligand LUMO → arrow goes L→M
    // For MLCT: ligand LUMO is *lower* than metal HOMO+1? actually MLCT: filled metal d → empty ligand π*
    // We'll just visualise the direction.
    if (this.dir === 'LMCT') {
      drawLevel(mX, dY + dH * 0.25, 'M LUMO (d empty)', theme.crimson, 0);
      drawLevel(mX, dY + dH * 0.85, 'M HOMO (filled)', '#5a78a8', 2);
      drawLevel(lX, dY + dH * 0.10, 'L LUMO (π*)', '#5a78a8', 0);
      drawLevel(lX, dY + dH * 0.55, 'L HOMO (lone pair)', '#1f7a4d', 2);
      // Arrow from L HOMO to M LUMO
      g.strokeStyle = theme.crimson; g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(lX - 60, dY + dH * 0.55); g.lineTo(mX + 60, dY + dH * 0.25);
      g.stroke();
      // Arrowhead
      const ax = mX + 60, ay = dY + dH * 0.25;
      const dx = ax - (lX - 60), dy = ay - (dY + dH * 0.55);
      const ang = Math.atan2(dy, dx);
      g.beginPath();
      g.moveTo(ax, ay); g.lineTo(ax - 10 * Math.cos(ang - 0.4), ay - 10 * Math.sin(ang - 0.4));
      g.moveTo(ax, ay); g.lineTo(ax - 10 * Math.cos(ang + 0.4), ay - 10 * Math.sin(ang + 0.4));
      g.stroke();
      g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'center';
      g.fillText('L → M', (lX + mX) / 2, dY + dH * 0.42);
    } else {
      drawLevel(mX, dY + dH * 0.10, 'M LUMO', '#5a78a8', 0);
      drawLevel(mX, dY + dH * 0.55, 'M HOMO (filled d)', '#1f7a4d', 2);
      drawLevel(lX, dY + dH * 0.25, 'L LUMO (π* empty)', theme.crimson, 0);
      drawLevel(lX, dY + dH * 0.85, 'L HOMO', '#5a78a8', 2);
      // Arrow from M HOMO to L LUMO
      g.strokeStyle = theme.crimson; g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(mX + 60, dY + dH * 0.55); g.lineTo(lX - 60, dY + dH * 0.25);
      g.stroke();
      const ax = lX - 60, ay = dY + dH * 0.25;
      const dx = ax - (mX + 60), dy = ay - (dY + dH * 0.55);
      const ang = Math.atan2(dy, dx);
      g.beginPath();
      g.moveTo(ax, ay); g.lineTo(ax - 10 * Math.cos(ang - 0.4), ay - 10 * Math.sin(ang - 0.4));
      g.moveTo(ax, ay); g.lineTo(ax - 10 * Math.cos(ang + 0.4), ay - 10 * Math.sin(ang + 0.4));
      g.stroke();
      g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'center';
      g.fillText('M → L', (lX + mX) / 2, dY + dH * 0.42);
    }

    // Example table on the right
    const tx = lX + 100;
    const tw = w - tx - M;
    if (tw > 100) {
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
      g.fillText('example compounds:', tx, dY);
      let y = dY + 22;
      for (const ex of EXAMPLES[this.dir]) {
        g.fillStyle = theme.ink; g.font = '11px serif';
        g.fillText(ex.name, tx, y);
        g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
        g.fillText(`λ_max ${ex.lambda} nm`, tx, y + 14);
        g.fillStyle = ex.lambda < 380 ? '#f0eee5' : complementCss(ex.lambda);
        g.fillRect(tx + tw - 60, y - 10, 40, 22);
        g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(tx + tw - 60, y - 10, 40, 22);
        g.fillStyle = theme.inkAlpha(0.55); g.font = '10px serif';
        g.fillText(ex.colour, tx, y + 28);
        y += 60;
      }
    }

    // Bottom: spectrum strip
    const sy = dY + dH + 40;
    const sx = M;
    const sw = w - 2 * M;
    const sh = 50;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('visible spectrum · markers for each example', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      const lam = 280 + (i / sw) * 500;
      g.fillStyle = lam < 380 ? `rgba(150,140,180,${0.4 + 0.6 * (lam - 280) / 100})` : wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    for (const ex of EXAMPLES[this.dir]) {
      const xm = sx + ((ex.lambda - 280) / 500) * sw;
      g.strokeStyle = theme.crimson; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(xm, sy); g.lineTo(xm, sy + sh); g.stroke();
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [300, 400, 500, 600, 700]) {
      const lx = sx + ((l - 280) / 500) * sw;
      g.fillText(`${l}`, lx, sy + sh + 14);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('CT bands are 100–1000× more intense than d-d bands (ε ≈ 1000–10000 vs 10–100) — that\'s why permanganate is so vivid at trace concentration.', M, h - M);
  }
}

new ChargeTransfer();
