import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const STREET = '#e9e5d8';
const BLOCK = '#16161f';

class LateralInhibition {
  private stage: CanvasStage;
  private bar = 32;
  private overlay: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bar = hydrateNumber('bar', 32);
    this.overlay = (hydrateFromUrl('overlay') as 'off' | 'on') ?? 'off';
    (document.getElementById('bar') as EncSlider).value = this.bar;
    (document.getElementById('overlay') as EncToggle).value = this.overlay;
    registerStateParam('bar', () => this.bar);
    registerStateParam('overlay', () => this.overlay);
    (document.getElementById('bar') as EncSlider).addEventListener('input', (e) => {
      this.bar = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('overlay') as EncToggle).addEventListener('change', (e) => {
      this.overlay = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.bar = 32; this.overlay = 'off';
      (document.getElementById('bar') as EncSlider).value = 32;
      (document.getElementById('overlay') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const bar = this.bar;
    const square = Math.round(bar * 2.5);
    const cell = square + bar;

    // Light streets fill the whole stage.
    ctx.fillStyle = STREET;
    ctx.fillRect(0, 0, w, h);

    // Dark blocks leave a grid of streets of width `bar`.
    ctx.fillStyle = BLOCK;
    const x0 = bar, y0 = bar;
    for (let y = y0; y + square <= h - 2; y += cell) {
      for (let x = x0; x + square <= w - 2; x += cell) {
        ctx.fillRect(x, y, square, square);
      }
    }

    if (this.overlay === 'on') this.drawOverlay(ctx, x0, y0, square, bar);

    // Caption.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText("let your gaze drift — grey blobs haunt the crossings you don't look at", 12, h - 12);
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D, x0: number, y0: number, square: number, bar: number,
  ) {
    const surroundR = bar * 1.7, centreR = bar * 0.5;
    // A crossing centre (street intersection) and a street-segment centre.
    const cross = { x: x0 + square + bar / 2, y: y0 + square + bar / 2 };
    const street = { x: x0 + square + bar / 2, y: y0 + square / 2 };

    const ring = (cx: number, cy: number, label: string) => {
      ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(cx, cy, surroundR, 0, 2 * Math.PI); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(cx, cy, centreR, 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = theme.crimson; ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(label, cx + surroundR + 6, cy + 4);
    };
    ring(cross.x, cross.y, 'crossing → 4 bright arms in surround → more inhibition');
    ring(street.x, street.y, 'street → 2 bright arms → less inhibition');
  }
}
window.addEventListener('DOMContentLoaded', () => new LateralInhibition());
