import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Pair = 'lead-ultramarine' | 'lead-vermilion' | 'cadmium-copper-green' | 'zinc-iron-oxide';
const PAIRS: Pair[] = ['lead-ultramarine', 'lead-vermilion', 'cadmium-copper-green', 'zinc-iron-oxide'];

const INFO: Record<Pair, { left: string; right: string; leftRGB: [number, number, number]; rightRGB: [number, number, number]; product: string; severity: number }> = {
  'lead-ultramarine':     { left: 'lead white (2PbCO₃·Pb(OH)₂)', right: 'ultramarine (Na₈Al₆Si₆O₂₄S₄)', leftRGB: [240, 238, 230], rightRGB: [50, 60, 170], product: 'PbS (black) — sulphur from ultramarine attacks lead', severity: 0.9 },
  'lead-vermilion':       { left: 'lead white', right: 'vermilion (HgS)', leftRGB: [240, 238, 230], rightRGB: [200, 30, 30], product: 'PbS + HgO (boundary darkens, vermilion blackens too)', severity: 0.85 },
  'cadmium-copper-green': { left: 'cadmium yellow (CdS)', right: 'verdigris (Cu(OAc)₂)', leftRGB: [240, 200, 60], rightRGB: [80, 130, 90], product: 'slow Cd-Cu sulphate; mild darkening', severity: 0.55 },
  'zinc-iron-oxide':      { left: 'zinc white (ZnO)', right: 'iron oxide red (Fe₂O₃)', leftRGB: [240, 240, 238], rightRGB: [170, 70, 40], product: 'compatible — no reaction at boundary', severity: 0.05 },
};

class Incompat {
  private stage: CanvasStage;
  private pair: Pair = 'lead-ultramarine';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('pair');
    if (raw && (PAIRS as string[]).includes(raw)) this.pair = raw as Pair;
    const t = document.getElementById('pair') as EncToggle; t.value = this.pair;
    t.addEventListener('change', (e) => { this.pair = (e as CustomEvent).detail.value as Pair; this.draw(); notifyStateChange(); });
    registerStateParam('pair', () => this.pair);
    document.addEventListener('reset-params', () => { this.pair = 'lead-ultramarine'; t.value = 'lead-ultramarine'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.pair];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${i.left}   +   ${i.right}`, M, M);

    // Painting strip: two halves with darkened boundary
    const sy = M + 40;
    const sh = 180;
    const sw = w - 2 * M;
    g.fillStyle = `rgb(${i.leftRGB[0]},${i.leftRGB[1]},${i.leftRGB[2]})`;
    g.fillRect(M, sy, sw / 2, sh);
    g.fillStyle = `rgb(${i.rightRGB[0]},${i.rightRGB[1]},${i.rightRGB[2]})`;
    g.fillRect(M + sw / 2, sy, sw / 2, sh);
    // Boundary darkening gradient
    const bandW = 40;
    const cxB = M + sw / 2;
    const grad = g.createLinearGradient(cxB - bandW, sy, cxB + bandW, sy);
    grad.addColorStop(0, `rgba(0,0,0,0)`);
    grad.addColorStop(0.5, `rgba(0,0,0,${i.severity * 0.9})`);
    grad.addColorStop(1, `rgba(0,0,0,0)`);
    g.fillStyle = grad;
    g.fillRect(cxB - bandW, sy, bandW * 2, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`reaction product: ${i.product}`, M + sw / 2, sy + sh + 18);
    g.fillStyle = theme.crimson; g.font = '12px serif';
    g.fillText(`severity: ${(i.severity * 100).toFixed(0)}%`, M + sw / 2, sy + sh + 36);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Conservators routinely test cross-sections of old paintings for incompatible pigment interfaces. Many Vermeer-era lead+sulphide juxtapositions still darken visibly.', M, h - M);
  }
}

new Incompat();
