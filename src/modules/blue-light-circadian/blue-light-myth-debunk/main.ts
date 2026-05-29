import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const ELO = 1, EHI = 100000;
const SOURCES = [
  { label: 'e-reader (warm)', e: 15 },
  { label: 'evening phone', e: 40 },
  { label: 'bright laptop', e: 90 },
  { label: 'lit living room', e: 150 },
  { label: 'office daytime', e: 400 },
  { label: 'overcast outdoors', e: 5000 },
  { label: 'full daylight', e: 50000 },
];
const CLAIMS = [
  { verdict: 'real', v: 'REAL', claim: 'Evening screens shift the body clock', note: 'Genuine but modest at typical brightness; daytime light exposure matters far more.' },
  { verdict: 'myth', v: 'NO EVIDENCE', claim: 'Screen blue light damages the retina', note: 'No clinical evidence from normal use (AAO 2017). Doses are orders below hazard limits.' },
  { verdict: 'mixed', v: 'WEAK', claim: 'Blue-blocking glasses fix eye strain', note: 'Little effect on digital eye strain; a small sleep benefit at most.' },
];

class MythDebunk {
  private stage: CanvasStage;
  private view = 'doses';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.view = hydrateFromUrl('view') ?? 'doses';
    const t = document.getElementById('view') as EncToggle;
    t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.view = 'doses'; t.value = 'doses'; this.draw(); notifyStateChange(); });
  }

  private drawDoses(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gx = 170, gy = 40, gw = w - 230, gh = h - 110;
    const xMap = (E: number) => gx + (Math.log10(Math.max(ELO, E) / ELO) / Math.log10(EHI / ELO)) * gw;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1; ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const dec of [1, 10, 100, 1000, 10000, 100000]) { const x = xMap(dec); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.fillText(dec >= 1000 ? `${dec / 1000}k` : `${dec}`, x, gy + gh + 16); }
    const rowH = gh / SOURCES.length;
    SOURCES.forEach((s, i) => {
      const y = gy + i * rowH + rowH * 0.2, bh = rowH * 0.6;
      const screen = s.e <= 150;
      ctx.fillStyle = screen ? theme.crimson : theme.gold;
      ctx.fillRect(gx, y, xMap(s.e) - gx, bh);
      ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(s.label, gx - 10, y + bh / 2 + 4);
      ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${s.e.toLocaleString()} mel lux`, xMap(s.e) + 6, y + bh / 2 + 4);
    });
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('melanopic illuminance (lux, log scale)', gx + gw / 2, gy + gh + 32);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('every screen (red) sits far below the daytime sky (gold) — daylight dominates the dose', w / 2, h - 14);
  }

  private drawClaims(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const x0 = 60, y0 = 56, cw = w - 120, rowH = (h - 130) / CLAIMS.length;
    const COLORS: Record<string, string> = { real: '#2e7d4f', myth: '#9b2828', mixed: '#b07a1e' };
    CLAIMS.forEach((c, i) => {
      const y = y0 + i * rowH;
      ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fillRect(x0, y, cw, rowH - 16);
      ctx.fillStyle = COLORS[c.verdict]; ctx.fillRect(x0, y, 8, rowH - 16);
      // verdict chip
      ctx.fillStyle = COLORS[c.verdict]; ctx.font = '700 13px Inter, sans-serif'; ctx.textAlign = 'left';
      const chipW = ctx.measureText(c.v).width + 20;
      ctx.globalAlpha = 0.15; ctx.fillRect(x0 + 22, y + 16, chipW, 24); ctx.globalAlpha = 1;
      ctx.fillText(c.v, x0 + 32, y + 33);
      ctx.fillStyle = theme.ink; ctx.font = '600 16px Inter, sans-serif'; ctx.fillText(c.claim, x0 + 32 + chipW + 8, y + 33);
      ctx.fillStyle = theme.inkSoft; ctx.font = '13px Inter, sans-serif'; ctx.fillText(c.note, x0 + 32, y + 58);
    });
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('one real effect, two overstated — the circadian nudge is genuine, the damage scare is not', w / 2, h - 14);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    if (this.view === 'doses') this.drawDoses(ctx, w, h); else this.drawClaims(ctx, w, h);
  }
}
window.addEventListener('DOMContentLoaded', () => new MythDebunk());
