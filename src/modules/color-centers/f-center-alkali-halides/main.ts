import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Host = 'NaCl' | 'KCl' | 'KBr' | 'LiF';
const HOSTS: Host[] = ['NaCl', 'KCl', 'KBr', 'LiF'];
const INFO: Record<Host, { lambda: number; tint: [number, number, number] }> = {
  NaCl: { lambda: 460, tint: [220, 200, 100] },
  KCl:  { lambda: 560, tint: [220, 130, 210] },
  KBr:  { lambda: 620, tint: [120, 170, 220] },
  LiF:  { lambda: 250, tint: [240, 230, 220] }, // UV — appears colourless
};

class FCenter {
  private stage: CanvasStage;
  private host: Host = 'NaCl';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('host');
    if (raw && (HOSTS as string[]).includes(raw)) this.host = raw as Host;
    const t = document.getElementById('host') as EncToggle; t.value = this.host;
    t.addEventListener('change', (e) => { this.host = (e as CustomEvent).detail.value as Host; this.draw(); notifyStateChange(); });
    registerStateParam('host', () => this.host);
    document.addEventListener('reset-params', () => { this.host = 'NaCl'; t.value = 'NaCl'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.host];
    const inVisible = i.lambda >= 380 && i.lambda <= 700;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`host = ${this.host} · F-band λ = ${i.lambda} nm ${inVisible ? '' : '(UV — crystal looks colourless)'}`, M, M);

    // Lattice schematic (left)
    const cx = M + 30, cy = M + 50, cs = 36;
    for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
      const isCation = (row + col) % 2 === 0;
      const x = cx + col * cs, y = cy + row * cs;
      const isVacancy = row === 2 && col === 3 && !isCation;
      if (isVacancy) {
        // Empty circle + electron
        g.strokeStyle = theme.crimson; g.lineWidth = 1.5; g.setLineDash([3, 3]);
        g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        g.fillStyle = theme.crimson; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = '8px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('e⁻', x, y);
        g.textBaseline = 'alphabetic';
      } else {
        g.fillStyle = isCation ? '#cfc8b0' : '#5a78a8';
        g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#1a1a1a'; g.font = '10px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(isCation ? this.host[0] : (this.host === 'KBr' ? 'Br' : this.host.slice(-1)), x, y);
        g.textBaseline = 'alphabetic';
      }
    }
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('anion vacancy + trapped electron', cx + 3 * cs, cy + 5 * cs + 20);

    // Crystal swatch (right)
    const sx = cx + 8 * cs, sy = cy, sw = 220, sh = 180;
    g.fillStyle = `rgb(${i.tint[0]},${i.tint[1]},${i.tint[2]})`;
    g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`irradiated ${this.host} crystal`, sx + sw / 2, sy + sh + 16);

    // Absorption spectrum strip
    const by = sy + sh + 50, bx = M, bw = w - 2 * M, bh = 50;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('F-band absorption on the visible spectrum', bx, by - 4);
    for (let p = 0; p < bw; p++) {
      const lam = 280 + (p / bw) * 500;
      g.fillStyle = lam < 380 ? `rgba(140,120,180,${0.4 + 0.5 * (lam - 280) / 100})` : wavelengthCss(lam);
      g.fillRect(bx + p, by, 1, bh);
    }
    if (i.lambda >= 280) {
      const sigma = 35;
      for (let p = 0; p < bw; p++) {
        const lam = 280 + (p / bw) * 500;
        const a = Math.exp(-Math.pow((lam - i.lambda) / sigma, 2));
        if (a > 0.02) { g.fillStyle = `rgba(0,0,0,${a * 0.85})`; g.fillRect(bx + p, by, 1, bh); }
      }
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, bw, bh);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Thermal annealing destroys F-centres (electron escapes, vacancy collapses). Irradiated salt slowly fades over months at room temperature.', M, h - M);
  }
}

new FCenter();
