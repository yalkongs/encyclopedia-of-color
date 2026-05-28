import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const ORANGE = '#e6a85a', PURPLE = '#5d3f86';

class Watercolor {
  private stage: CanvasStage;
  private swap = 'orange';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.swap = hydrateFromUrl('swap') ?? 'orange';
    (document.getElementById('swap') as EncToggle).value = this.swap;
    registerStateParam('swap', () => this.swap);
    (document.getElementById('swap') as EncToggle).addEventListener('change', (e) => {
      this.swap = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.swap = 'orange';
      (document.getElementById('swap') as EncToggle).value = 'orange';
      this.draw(); notifyStateChange();
    });
  }

  private wavyPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
    const lobes = 9, amp = R * 0.12;
    ctx.beginPath();
    for (let i = 0; i <= 360; i += 2) {
      const a = (i * Math.PI) / 180;
      const r = R + amp * Math.sin(lobes * a);
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, w, h);

    const innerColor = this.swap === 'orange' ? ORANGE : PURPLE;
    const outerColor = this.swap === 'orange' ? PURPLE : ORANGE;
    const cx = w * 0.46, cy = h * 0.5, R = Math.min(w * 0.3, h * 0.4);

    // Faint interior wash in the inner contour's hue (the illusion, rendered subtly).
    this.wavyPath(ctx, cx, cy, R - 6);
    ctx.fillStyle = this.swap === 'orange' ? 'rgba(230,168,90,0.14)' : 'rgba(93,63,134,0.14)';
    ctx.fill();

    // Outer contour, then inner contour just inside it.
    this.wavyPath(ctx, cx, cy, R);
    ctx.strokeStyle = outerColor; ctx.lineWidth = 6; ctx.stroke();
    this.wavyPath(ctx, cx, cy, R - 5);
    ctx.strokeStyle = innerColor; ctx.lineWidth = 4; ctx.stroke();

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`inner line: ${this.swap}  ·  the enclosed area looks faintly ${this.swap}-tinted`, w * 0.1, h - 32);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('the interior is nearly blank paper — the colour is spread from the boundary', w * 0.1, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new Watercolor());
