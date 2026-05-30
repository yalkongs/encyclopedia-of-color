import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type L = 'chromatophore' | 'iridophore' | 'leucophore' | 'all';
const LS: L[] = ['chromatophore', 'iridophore', 'leucophore', 'all'];

class OctoIrid {
  private stage: CanvasStage;
  private layer: L = 'all';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('layer');
    if (raw && (LS as string[]).includes(raw)) this.layer = raw as L;
    const t = document.getElementById('layer') as EncToggle; t.value = this.layer;
    t.addEventListener('change', (e) => { this.layer = (e as CustomEvent).detail.value as L; this.draw(); notifyStateChange(); });
    registerStateParam('layer', () => this.layer);
    document.addEventListener('reset-params', () => { this.layer = 'all'; t.value = 'all'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`octopus skin layer: ${this.layer}`, M, M);

    // Stack of three layers
    const sx = M + 30, sy = M + 50, sw = 400;
    const showLeu = this.layer === 'leucophore' || this.layer === 'all';
    const showIri = this.layer === 'iridophore' || this.layer === 'all';
    const showChr = this.layer === 'chromatophore' || this.layer === 'all';
    if (showLeu) { g.fillStyle = '#f8f4ee'; g.fillRect(sx, sy + 200, sw, 60); g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.fillText('leucophore: broadband white scatter', sx + 8, sy + 235); }
    if (showIri) { g.fillStyle = '#80c8ff'; g.fillRect(sx, sy + 100, sw, 60); g.fillStyle = theme.ink; g.font = '11px serif'; g.fillText('iridophore: Bragg multilayer, structural blue', sx + 8, sy + 135); }
    if (showChr) { g.fillStyle = '#a04030'; g.fillRect(sx, sy, sw, 60); g.fillStyle = '#fff'; g.font = '11px serif'; g.fillText('chromatophore: pigment, neural-fast', sx + 8, sy + 35); }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Three layers stacked: pigment top, structural middle, white scatter bottom — the octopus tunes them together to match arbitrary scenes.', M, h - M);
  }
}

new OctoIrid();
