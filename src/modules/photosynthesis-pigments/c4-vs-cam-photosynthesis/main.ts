import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Strat = 'C3' | 'C4' | 'CAM';
const STRATS: Strat[] = ['C3', 'C4', 'CAM'];

const INFO: Record<Strat, { example: string; wue: number; note: string }> = {
  C3:  { example: 'wheat, rice, oak', wue: 0.25, note: 'RuBisCO fixes CO₂ directly in mesophyll; high photorespiration loss in heat' },
  C4:  { example: 'corn, sugarcane, sorghum', wue: 0.55, note: 'Kranz anatomy: PEP-C concentrates CO₂ in bundle-sheath cells, RuBisCO sees saturating [CO₂]' },
  CAM: { example: 'cactus, agave, pineapple', wue: 0.95, note: 'Stomata open at night, fix CO₂ → malate; day stomata closed, malate releases CO₂' },
};

class C4CAM {
  private stage: CanvasStage;
  private strat: Strat = 'C3';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('strat');
    if (raw && (STRATS as string[]).includes(raw)) this.strat = raw as Strat;
    const t = document.getElementById('strat') as EncToggle; t.value = this.strat;
    t.addEventListener('change', (e) => { this.strat = (e as CustomEvent).detail.value as Strat; this.draw(); notifyStateChange(); });
    registerStateParam('strat', () => this.strat);
    document.addEventListener('reset-params', () => { this.strat = 'C3'; t.value = 'C3'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.strat];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`strategy: ${this.strat} (${i.example})`, M, M);

    // Leaf cross-section
    const lx = M + 30, ly = M + 60, lw = 380, lh = 160;
    g.fillStyle = '#dde7d0'; g.fillRect(lx, ly, lw, lh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(lx, ly, lw, lh);
    // Stomata at bottom
    for (let s = 0; s < 5; s++) {
      const sx = lx + 40 + s * 70;
      const open = this.strat === 'CAM' ? false : true;
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(sx - 12, ly + lh); g.lineTo(sx - 4, ly + lh + 8);
      g.moveTo(sx + 12, ly + lh); g.lineTo(sx + 4, ly + lh + 8);
      g.stroke();
      if (open) { g.beginPath(); g.moveTo(sx - 4, ly + lh + 8); g.lineTo(sx + 4, ly + lh + 8); g.stroke(); }
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText(this.strat === 'CAM' ? 'stomata CLOSED in day, open at night' : 'stomata open by day', lx + lw / 2, ly + lh + 24);

    // Inner cells
    if (this.strat === 'C4') {
      // Mesophyll + bundle-sheath bands
      g.fillStyle = '#a8c894'; g.fillRect(lx + 10, ly + 20, lw - 20, 50);
      g.fillStyle = '#7ba562'; g.fillRect(lx + 10, ly + 80, lw - 20, 50);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
      g.fillText('mesophyll: PEP carboxylase fixes CO₂', lx + 20, ly + 50);
      g.fillText('bundle sheath: RuBisCO @ saturating CO₂', lx + 20, ly + 110);
    } else {
      g.fillStyle = '#a8c894'; g.fillRect(lx + 10, ly + 20, lw - 20, 110);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
      g.fillText('mesophyll: RuBisCO fixes CO₂ ' + (this.strat === 'CAM' ? '(at night from stored malate)' : 'directly'), lx + 20, ly + 80);
    }

    // Water-use bar
    const by = ly + lh + 70;
    g.fillStyle = theme.ink; g.font = '13px serif';
    g.fillText('water-use efficiency:', M, by);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, by + 10, w - 2 * M, 18);
    g.fillStyle = theme.crimson; g.fillRect(M, by + 10, i.wue * (w - 2 * M), 18);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`${(i.wue * 100).toFixed(0)}%`, M + i.wue * (w - 2 * M) + 6, by + 24);

    // Note
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    g.fillText(i.note, M, by + 50);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65);
    g.fillText('C4 and CAM are convergent evolution responses to dryness/heat — same chlorophyll, different geometry, different water economics.', M, h - M);
  }
}

new C4CAM();
