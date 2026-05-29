import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { clusteredScreen } from '@core/render/halftone';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const CELL = 7;
const COV = 0.5; // flat mid tint per plate

// angular gap modulo the 90° symmetry of a square dot screen
function gap90(a: number, b: number): number { const d = Math.abs(a - b) % 90; return Math.min(d, 90 - d); }

class ScreenAngles {
  private stage: CanvasStage;
  private cangle = 15;
  private showy = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cangle = hydrateNumber('cangle', 15);
    this.showy = hydrateFromUrl('showy') ?? 'on';
    const s = document.getElementById('cangle') as EncSlider;
    s.value = this.cangle;
    s.addEventListener('input', (e) => { this.cangle = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cangle', () => Math.round(this.cangle));
    const t = document.getElementById('showy') as EncToggle;
    t.value = this.showy;
    t.addEventListener('change', (e) => { this.showy = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('showy', () => this.showy);
    document.addEventListener('reset-params', () => { this.cangle = 15; this.showy = 'on'; s.value = 15; t.value = 'on'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const x0 = 30, y0 = 30, x1 = w - 30, y1 = h - 56;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);

    const flat = () => COV;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    if (this.showy === 'on') clusteredScreen(ctx, x0, y0, x1, y1, CELL, 90, '#fff200', flat);
    clusteredScreen(ctx, x0, y0, x1, y1, CELL, this.cangle, '#00aeef', flat);     // cyan
    clusteredScreen(ctx, x0, y0, x1, y1, CELL, 75, '#ec008c', flat);              // magenta
    clusteredScreen(ctx, x0, y0, x1, y1, CELL, 45, '#231f20', flat);             // black
    ctx.restore();

    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

    const dM = gap90(this.cangle, 75), dK = gap90(this.cangle, 45), dY = gap90(this.cangle, 90);
    const nearest = Math.min(dM, dK, dY);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(nearest >= 25
      ? `cyan at ${Math.round(this.cangle)}° — ${nearest.toFixed(0)}° from its neighbours: a clean rosette`
      : `cyan at ${Math.round(this.cangle)}° — only ${nearest.toFixed(0)}° from a neighbour: moiré bands bloom`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ScreenAngles());
