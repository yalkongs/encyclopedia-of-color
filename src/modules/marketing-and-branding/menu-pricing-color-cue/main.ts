import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const ITEMS = [
  { name: 'House Salad', base: 14 },
  { name: 'Grilled Salmon', base: 24 },
  { name: 'Truffle Risotto', base: 26 },
  { name: 'Steak Frites', base: 32 },
  { name: 'Whole Lobster (anchor)', base: 42, anchor: true },
];

class MenuPricing {
  private stage: CanvasStage;
  private p = 42;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.p = hydrateNumber('p', 42);
    const s = document.getElementById('p') as EncSlider; s.value = this.p;
    s.addEventListener('input', (e) => { this.p = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('p', () => Math.round(this.p));
    document.addEventListener('reset-params', () => { this.p = 42; s.value = 42; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Average ticket as a function of anchor price.
    // Without anchor: $26 average. With anchor scaling 0.15 × (anchor - 32).
    const avg = 26 + Math.max(0, this.p - 32) * 0.18;
    const liftPct = ((avg - 26) / 26) * 100;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`anchor = $${this.p} · expected avg ticket $${avg.toFixed(2)} (+${liftPct.toFixed(1)}%)`, M, M);

    // Menu mockup
    const mx = M, my = M + 40, mw = (w - 2 * M) * 0.6, mh = h - 2 * M - 90;
    g.fillStyle = '#f0e6d4'; g.fillRect(mx, my, mw, mh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(mx, my, mw, mh);
    g.fillStyle = theme.ink; g.font = 'bold 18px serif'; g.textAlign = 'center';
    g.fillText('Le Bistro — Tasting Menu', mx + mw / 2, my + 30);
    g.strokeStyle = theme.inkAlpha(0.3); g.beginPath();
    g.moveTo(mx + 30, my + 50); g.lineTo(mx + mw - 30, my + 50); g.stroke();

    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      const y0 = my + 80 + i * 38;
      const price = it.anchor ? this.p : it.base;
      const isAnchor = it.anchor;
      g.fillStyle = isAnchor ? theme.crimson : theme.ink;
      g.font = isAnchor ? 'bold 14px serif' : '14px serif';
      g.textAlign = 'left';
      g.fillText(it.name, mx + 30, y0);
      g.textAlign = 'right';
      g.fillText(`${price}`, mx + mw - 30, y0);
      // Dot leader
      g.strokeStyle = theme.inkAlpha(0.3); g.lineWidth = 1; g.setLineDash([2, 4]);
      g.beginPath(); g.moveTo(mx + 30 + g.measureText(it.name).width + 6, y0 - 4); g.lineTo(mx + mw - 30 - g.measureText(`${price}`).width - 6, y0 - 4); g.stroke(); g.setLineDash([]);
    }

    // Average ticket chart
    const cy = my + 20, cx = mx + mw + 30, cw = w - cx - M, ch = mh - 40;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('expected avg ticket vs anchor', cx + cw / 2, cy - 4);
    const X = (pp: number) => cx + ((pp - 20) / 60) * cw;
    const Y = (av: number) => cy + (1 - (av - 25) / 11) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let pp = 20; pp <= 80; pp++) {
      const av = 26 + Math.max(0, pp - 32) * 0.18;
      const x = X(pp), y = Y(av);
      if (pp === 20) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.p), Y(avg), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
    g.textAlign = 'left'; g.fillText('$20', cx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('$80', cx + cw, cy + ch + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Note: no "$" symbol on actual restaurant menus — pure dollar number reduces "pain of payment" priming (Cornell Hotel 2009).', M, h - M);
  }
}

new MenuPricing();
