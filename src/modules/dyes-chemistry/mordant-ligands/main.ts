import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Mordant = 'none' | 'Al' | 'Fe' | 'Cu' | 'Cr';
const MORDANTS: Mordant[] = ['none', 'Al', 'Fe', 'Cu', 'Cr'];
// Madder (alizarin) historical colours per mordant
const RESULT: Record<Mordant, { name: string; rgb: [number, number, number]; lightfast: number }> = {
  none: { name: 'pale orange (washes out)',  rgb: [220, 160, 130], lightfast: 0.2 },
  Al:   { name: 'pink–red (Turkey red)',     rgb: [220, 55, 65],   lightfast: 0.9 },
  Fe:   { name: 'purple–violet ("sad")',     rgb: [110, 50, 95],   lightfast: 0.85 },
  Cu:   { name: 'rust–brown',                 rgb: [150, 80, 50],   lightfast: 0.8 },
  Cr:   { name: 'deep brown',                 rgb: [85, 55, 35],    lightfast: 0.95 },
};
const METAL_COLOUR: Record<Mordant, string> = {
  none: '#999', Al: '#c8c8d0', Fe: '#8a4a3e', Cu: '#b87333', Cr: '#5a778a',
};

class MordantModule {
  private stage: CanvasStage;
  private m: Mordant = 'Al';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('m');
    if (raw && (MORDANTS as string[]).includes(raw)) this.m = raw as Mordant;
    const t = document.getElementById('m') as EncToggle; t.value = this.m;
    t.addEventListener('change', (e) => { this.m = (e as CustomEvent).detail.value as Mordant; this.draw(); notifyStateChange(); });
    registerStateParam('m', () => this.m);
    document.addEventListener('reset-params', () => { this.m = 'Al'; t.value = 'Al'; this.draw(); notifyStateChange(); });
  }

  // 5-membered chelate ring: Fibre-O - M - O-Dye + C=C (anhydrous version)
  private drawChelate(g: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
    const verts: [number, number, string][] = [
      [cx, cy - R, 'M'],
      [cx + R * 0.95, cy - R * 0.31, 'O'],
      [cx + R * 0.59, cy + R * 0.81, 'C'],
      [cx - R * 0.59, cy + R * 0.81, 'C'],
      [cx - R * 0.95, cy - R * 0.31, 'O'],
    ];
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = verts[i], b = verts[(i + 1) % 5];
      g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    }
    g.stroke();
    // Atom circles
    for (const [x, y, label] of verts) {
      const isMetal = label === 'M';
      g.fillStyle = isMetal ? (this.m === 'none' ? '#bbb' : METAL_COLOUR[this.m]) : '#dbe7ee';
      g.beginPath(); g.arc(x, y, isMetal ? 14 : 11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.stroke();
      g.fillStyle = isMetal ? '#fff' : '#1a1a1a'; g.font = isMetal ? '12px serif' : '11px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(isMetal ? (this.m === 'none' ? '–' : this.m) : label, x, y);
    }
    g.textBaseline = 'alphabetic';
    // Dashed bond lines extending from O atoms (fibre side and dye side)
    g.strokeStyle = '#1a1a1a'; g.setLineDash([3, 3]); g.lineWidth = 1.2;
    // Left O → fibre
    g.beginPath(); g.moveTo(verts[4][0] - 8, verts[4][1] + 2); g.lineTo(verts[4][0] - 70, verts[4][1] + 30); g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'right';
    g.fillText('fibre', verts[4][0] - 60, verts[4][1] + 45);
    // Right O → dye
    g.beginPath(); g.moveTo(verts[1][0] + 8, verts[1][1] + 2); g.lineTo(verts[1][0] + 70, verts[1][1] + 30); g.stroke();
    g.textAlign = 'left';
    g.fillText('dye chromophore (alizarin)', verts[1][0] + 60, verts[1][1] + 45);
    g.setLineDash([]);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const r = RESULT[this.m];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`madder root + ${this.m === 'none' ? 'no mordant' : `${this.m}³⁺ mordant`} → ${r.name}`, M, M);

    // Chelate diagram (left half)
    this.drawChelate(g, M + 180, M + 200, 80);

    // Right: swatch + comparison
    const sx = w / 2 + 30, sy = M + 50;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('dyed wool (madder root)', sx, sy);
    g.fillStyle = `rgb(${r.rgb[0]},${r.rgb[1]},${r.rgb[2]})`;
    g.fillRect(sx, sy + 10, 200, 100);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy + 10, 200, 100);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(r.name, sx, sy + 130);

    // Lightfastness bar
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('lightfastness (predicted):', sx, sy + 160);
    const lfW = 200;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy + 170, lfW, 14);
    g.fillStyle = theme.crimson; g.fillRect(sx, sy + 170, lfW * r.lightfast, 14);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`${(r.lightfast * 100).toFixed(0)}%`, sx + lfW + 8, sy + 182);

    // Comparison strip — all 5 results side-by-side
    const cy = sy + 220;
    const cw = 80;
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('all mordants on the same madder dye:', sx, cy);
    let cx = sx;
    for (const mm of MORDANTS) {
      const res = RESULT[mm];
      g.fillStyle = `rgb(${res.rgb[0]},${res.rgb[1]},${res.rgb[2]})`;
      g.fillRect(cx, cy + 8, cw - 8, 50);
      g.strokeStyle = mm === this.m ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = mm === this.m ? 2 : 1;
      g.strokeRect(cx, cy + 8, cw - 8, 50);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(mm, cx + (cw - 8) / 2, cy + 76);
      cx += cw;
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same chromophore (alizarin), same fibre, same dye-bath — the metal\'s d-orbital field perturbs the dye HOMO/LUMO and shifts the colour.', M, h - M);
  }
}

new MordantModule();
