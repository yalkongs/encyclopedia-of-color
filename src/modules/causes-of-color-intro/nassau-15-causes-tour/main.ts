import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Cause { id: number; group: string; name: string; example: string; rgb: [number, number, number]; }
const CAUSES: Cause[] = [
  { id: 1,  group: 'emission',   name: 'incandescence',                   example: 'tungsten filament',              rgb: [255, 200, 130] },
  { id: 2,  group: 'emission',   name: 'gas excitation',                   example: 'neon sign',                      rgb: [255, 60, 60] },
  { id: 3,  group: 'emission',   name: 'vibrations / rotations',           example: 'water IR cyan tint',             rgb: [110, 180, 200] },
  { id: 4,  group: 'transitions',name: 'ligand-field (d-d)',               example: 'turquoise (Cu²⁺)',               rgb: [80, 200, 200] },
  { id: 5,  group: 'transitions',name: 'charge transfer',                  example: 'permanganate (KMnO₄)',           rgb: [110, 50, 130] },
  { id: 6,  group: 'transitions',name: 'organic π-conjugation',            example: 'β-carotene (carrot)',            rgb: [230, 130, 60] },
  { id: 7,  group: 'transitions',name: 'donor-acceptor / band-gap',        example: 'CdS yellow pigment',             rgb: [240, 220, 60] },
  { id: 8,  group: 'solid state',name: 'colour centres',                   example: 'amethyst (Fe-vacancy)',          rgb: [150, 90, 180] },
  { id: 9,  group: 'solid state',name: 'lasers, fluorescence',             example: 'GFP green',                      rgb: [80, 220, 100] },
  { id: 10, group: 'solid state',name: 'absorption by colour centres+',    example: 'smoky quartz',                   rgb: [85, 65, 50] },
  { id: 11, group: 'optics',     name: 'dispersive refraction',             example: 'prism rainbow',                  rgb: [200, 200, 220] },
  { id: 12, group: 'optics',     name: 'scattering (Rayleigh)',             example: 'blue sky',                       rgb: [110, 160, 210] },
  { id: 13, group: 'optics',     name: 'interference (thin films)',         example: 'soap bubble swirl',              rgb: [200, 130, 220] },
  { id: 14, group: 'optics',     name: 'interference (multi-layer)',        example: 'morpho butterfly wing',          rgb: [50, 100, 220] },
  { id: 15, group: 'optics',     name: 'diffraction',                       example: 'opal flash',                     rgb: [240, 100, 100] },
];

class NassauTour {
  private stage: CanvasStage;
  private id = 6;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.id = hydrateNumber('cause', 6);
    const s = document.getElementById('cause') as EncSlider; s.value = this.id;
    s.addEventListener('input', (e) => { this.id = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cause', () => Math.round(this.id));
    document.addEventListener('reset-params', () => { this.id = 6; s.value = 6; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const c = CAUSES[this.id - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Cause #${c.id} (${c.group}) — ${c.name}`, M, M);
    g.fillStyle = theme.inkAlpha(0.75); g.font = '12px serif';
    g.fillText(`example: ${c.example}`, M, M + 18);

    // Big swatch
    g.fillStyle = `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
    g.fillRect(M, M + 40, w / 2 - M - 10, 220);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, M + 40, w / 2 - M - 10, 220);

    // Right: full list with current highlighted
    const lx = w / 2 + 10, ly = M + 40;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('15 causes:', lx, ly);
    for (let i = 0; i < CAUSES.length; i++) {
      const cy = ly + 18 + i * 16;
      const cc = CAUSES[i];
      g.fillStyle = cc.id === this.id ? theme.crimson : theme.inkAlpha(0.75);
      g.font = cc.id === this.id ? '12px serif' : '11px serif';
      g.fillText(`${cc.id.toString().padStart(2, ' ')}. ${cc.name}`, lx, cy);
      // mini swatch
      g.fillStyle = `rgb(${cc.rgb[0]},${cc.rgb[1]},${cc.rgb[2]})`;
      g.fillRect(lx + 240, cy - 10, 30, 14);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Every chemistry/biology/optics module on this site is tagged by Nassau cause — drill into the tag to see the full set covering each mechanism.', M, h - M);
  }
}

new NassauTour();
