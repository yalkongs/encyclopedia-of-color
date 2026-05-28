import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PlaneMirror {
  private stage: CanvasStage;
  private dist = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dist = hydrateNumber('s', 100);
    (document.getElementById('s') as EncSlider).value = this.dist;
    registerStateParam('s', () => this.dist);
    (document.getElementById('s') as EncSlider).addEventListener('input', (e) => {
      this.dist = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.dist = 100; (document.getElementById('s') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const mx = w * 0.5;  // mirror x
    const cy = h * 0.5;

    // Mirror surface (left side reflective)
    ctx.fillStyle = theme.slateAlpha(0.10);
    ctx.fillRect(mx, 0, w - mx, h);   // behind-mirror region (tinted)
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, 30); ctx.lineTo(mx, h - 30); ctx.stroke();
    // hatching to indicate reflective surface
    ctx.lineWidth = 1;
    for (let y = 35; y < h - 30; y += 10) {
      ctx.beginPath();
      ctx.moveTo(mx, y); ctx.lineTo(mx + 6, y + 6);
      ctx.stroke();
    }

    const objX = mx - this.dist;
    const imgX = mx + this.dist;

    // Object — small arrow pointing up
    this.drawArrow(ctx, objX, cy, 'up', theme.ink, 'object');
    // Virtual image — same shape, but greyed (and reversed left-right)
    this.drawArrow(ctx, imgX, cy, 'up', theme.goldAlpha(0.55), 'virtual image');

    // Two reflected rays from object top
    const objTop = { x: objX, y: cy - 36 };
    const eyeY = cy - 80;
    for (const eyeX of [mx - 200, mx - 120]) {
      const hitY = (objTop.y + eyeY) / 2;
      // approximate — reflect about mirror
      ctx.strokeStyle = theme.goldAlpha(0.55); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(objTop.x, objTop.y);
      const hitX = mx;
      ctx.lineTo(hitX, hitY);
      ctx.lineTo(eyeX, eyeY);
      ctx.stroke();
      // Back-trace to virtual image
      ctx.strokeStyle = theme.goldAlpha(0.25);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(hitX, hitY); ctx.lineTo(imgX, cy - 36);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Distance calipers
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1;
    const calY = cy + 80;
    ctx.beginPath();
    ctx.moveTo(objX, calY); ctx.lineTo(mx, calY);
    ctx.moveTo(objX, calY - 4); ctx.lineTo(objX, calY + 4);
    ctx.moveTo(mx, calY - 4); ctx.lineTo(mx, calY + 4);
    ctx.moveTo(mx, calY); ctx.lineTo(imgX, calY);
    ctx.moveTo(imgX, calY - 4); ctx.lineTo(imgX, calY + 4);
    ctx.stroke();
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`s = ${this.dist}`, (objX + mx) / 2 - 24, calY + 18);
    ctx.fillText(`s' = ${this.dist}`, (mx + imgX) / 2 - 22, calY + 18);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`object distance s   = ${this.dist} px`, 16, 28);
    ctx.fillText(`image  distance s'  = ${this.dist} px`, 16, 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('virtual image — light only appears to come from behind mirror', 16, h - 24);
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, _dir: string, color: string, label: string) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 12); ctx.lineTo(x, y - 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 42); ctx.lineTo(x - 5, y - 32); ctx.lineTo(x + 5, y - 32);
    ctx.closePath(); ctx.fill();
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(label, x - ctx.measureText(label).width / 2, y + 28);
  }
}
window.addEventListener('DOMContentLoaded', () => new PlaneMirror());
