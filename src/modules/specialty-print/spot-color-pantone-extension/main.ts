import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

// Brand Pantones with approximate spot sRGB, CMYK simulation (Color Bridge style), and a tightened Hexachrome guess.
const PANTONES = [
  { name: 'Coca-Cola red — PMS 185', spot: '#E4002B', cmyk: '#E60026', hexa: '#E4002B' },
  { name: 'IBM blue — PMS 286',      spot: '#0033A0', cmyk: '#003DA5', hexa: '#0035A0' },
  { name: 'Reflex Blue',             spot: '#001489', cmyk: '#1E3FA8', hexa: '#0E27A0' },
  { name: 'John Deere green — 354',  spot: '#00B140', cmyk: '#00A651', hexa: '#00AE46' },
  { name: 'Tiffany blue — 1837',     spot: '#0ABAB5', cmyk: '#1DB0AB', hexa: '#0EB6B0' },
  { name: 'PMS 376 — vivid lime',    spot: '#84BD00', cmyk: '#8DC641', hexa: '#86BE0F' },
];

function hexToRgb(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function deltaApprox(a: [number, number, number], b: [number, number, number]): number { return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 2.55; }

class PantoneSpot {
  private stage: CanvasStage;
  private mode = 'spot';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mode = hydrateFromUrl('mode') ?? 'spot';
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.mode = 'spot'; t.value = 'spot'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const cols = 3, rows = 2, gx = 40, gy = 56, gw = w - 80, gh = h - 130;
    const pw = gw / cols, ph = gh / rows, pad = 14;
    let totalShift = 0, worst = { name: '', d: 0 };
    PANTONES.forEach((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = gx + c * pw + pad, y = gy + r * ph + pad, sw = pw - pad * 2, sh = ph - pad * 2;
      const swatch = this.mode === 'spot' ? p.spot : this.mode === 'cmyk' ? p.cmyk : p.hexa;
      ctx.fillStyle = swatch; ctx.fillRect(x, y, sw, sh);
      // tiny reference chip of the spot ink in the corner for comparison
      if (this.mode !== 'spot') { ctx.fillStyle = p.spot; ctx.fillRect(x + sw - 32, y + sh - 18, 26, 12); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x + sw - 32, y + sh - 18, 26, 12); }
      ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x, y, sw, sh);
      const d = deltaApprox(hexToRgb(swatch), hexToRgb(p.spot));
      totalShift += d; if (d > worst.d) worst = { name: p.name, d };
      ctx.fillStyle = theme.ink; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(p.name, x, y - 6);
      if (this.mode !== 'spot') { ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`shift ≈ ${d.toFixed(1)}`, x + sw, y + sh + 14); }
    });
    const avg = totalShift / PANTONES.length;

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'spot'
      ? 'spot inks — each Pantone reproduces its brand colour exactly'
      : this.mode === 'cmyk'
        ? `CMYK process — average shift ≈ ${avg.toFixed(1)}; ${worst.name} is the worst (≈ ${worst.d.toFixed(1)})`
        : `Hexachrome (CMYK + orange + green) — average shift ≈ ${avg.toFixed(1)}, much closer than CMYK`,
      w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PantoneSpot());
