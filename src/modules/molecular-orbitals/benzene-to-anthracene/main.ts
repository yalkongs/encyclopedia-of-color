import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { drawFusedRings, wavelengthCss } from '@core/render/molecular';

const RINGS = [
  { n: 1, name: 'benzene',     lambda: 255, formula: 'C₆H₆',    colour: 'colourless (UV)' },
  { n: 2, name: 'naphthalene', lambda: 275, formula: 'C₁₀H₈',   colour: 'colourless (UV)' },
  { n: 3, name: 'anthracene',  lambda: 375, formula: 'C₁₄H₁₀',  colour: 'pale yellow' },
  { n: 4, name: 'tetracene',   lambda: 474, formula: 'C₁₈H₁₂',  colour: 'orange' },
];

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

class Acenes {
  private stage: CanvasStage;
  private n = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('n');
    if (raw && ['1', '2', '3', '4'].includes(raw)) this.n = parseInt(raw, 10);
    const t = document.getElementById('n') as EncToggle; t.value = String(this.n);
    t.addEventListener('change', (e) => { this.n = parseInt((e as CustomEvent).detail.value, 10); this.draw(); notifyStateChange(); });
    registerStateParam('n', () => String(this.n));
    document.addEventListener('reset-params', () => { this.n = 3; t.value = '3'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const cur = RINGS[this.n - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${cur.name} · ${cur.formula} · λ_α ≈ ${cur.lambda} nm`, M, M);

    // Big structure on the left
    const R = 24;
    const structY = M + 100;
    drawFusedRings(g, M + 10, structY, this.n, R);

    // Table of all four members (highlight active)
    const ty = structY + 90;
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('acene series — α-band absorption from measured UV-Vis (Birks 1970):', M, ty);
    const cols = ['n rings', 'name', 'formula', 'λ_α (nm)', 'crystal colour'];
    const colX = [M + 30, M + 110, M + 220, M + 320, M + 420];
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px monospace';
    for (let i = 0; i < 5; i++) g.fillText(cols[i], colX[i], ty + 22);
    g.strokeStyle = theme.inkAlpha(0.3); g.beginPath(); g.moveTo(M, ty + 28); g.lineTo(M + 560, ty + 28); g.stroke();
    for (let r = 0; r < 4; r++) {
      const row = RINGS[r];
      const y = ty + 44 + r * 18;
      g.fillStyle = row.n === this.n ? theme.crimson : theme.inkAlpha(0.8);
      g.fillText(`${row.n}`, colX[0], y);
      g.fillText(row.name, colX[1], y);
      g.fillText(row.formula, colX[2], y);
      g.fillText(`${row.lambda}`, colX[3], y);
      g.fillText(row.colour, colX[4], y);
    }

    // Spectrum panel on the right
    const sx = (w / 2) + 40, sy = M + 100, sw = w - sx - M, sh = 80;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('UV-Vis absorption · markers for all four', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      // 250..700 nm range to include UV anchors
      const lam = 250 + (i / sw) * 450;
      g.fillStyle = lam < 380 ? `rgba(180,170,200,${0.4 + 0.6 * (lam - 250) / 130})` : wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    // Markers for all 4
    for (const r of RINGS) {
      const xMark = sx + ((r.lambda - 250) / 450) * sw;
      g.strokeStyle = r.n === this.n ? theme.crimson : theme.inkAlpha(0.55);
      g.lineWidth = r.n === this.n ? 2.5 : 1.2;
      g.beginPath(); g.moveTo(xMark, sy); g.lineTo(xMark, sy + sh); g.stroke();
    }
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [300, 400, 500, 600, 700]) {
      const lx = sx + ((l - 250) / 450) * sw;
      g.fillText(`${l}`, lx, sy + sh + 14);
    }
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    const xCur = sx + ((cur.lambda - 250) / 450) * sw;
    g.fillText(`${cur.name} ${cur.lambda}`, Math.max(sx + 40, Math.min(sx + sw - 40, xCur)), sy - 12);

    // Visible boundary
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(sx + ((380 - 250) / 450) * sw, sy); g.lineTo(sx + ((380 - 250) / 450) * sw, sy + sh); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.55); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('← UV │ visible →', sx + ((380 - 250) / 450) * sw + 4, sy + 12);

    // Observed colour swatch
    const oy = sy + sh + 40;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('observed colour:', sx, oy);
    g.fillStyle = cur.lambda < 380 ? '#f0eee5' : complementCss(cur.lambda);
    g.fillRect(sx + 130, oy - 14, 100, 22);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 130, oy - 14, 100, 22);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Beyond tetracene → pentacene (deep blue), hexacene (dark green, unstable in air). Linear acenes red-shift; angular fusion (e.g. phenanthrene) shifts less.', M, h - M);
  }
}

new Acenes();
