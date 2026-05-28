import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const CELL = 88; // pinwheel tile size (px)

class OrientationColumns {
  private stage: CanvasStage;
  private theta = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.theta = hydrateNumber('theta', 30);
    (document.getElementById('theta') as EncSlider).value = this.theta;
    registerStateParam('theta', () => this.theta);
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.theta = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.theta = 30;
      (document.getElementById('theta') as EncSlider).value = 30;
      this.draw(); notifyStateChange();
    });
  }

  /** Preferred orientation (radians, [0,π)) at a point — tiled pinwheels. */
  private orientation(x: number, y: number): number {
    const cxId = Math.floor(x / CELL), cyId = Math.floor(y / CELL);
    const cx = (cxId + 0.5) * CELL, cy = (cyId + 0.5) * CELL;
    const chir = (cxId + cyId) % 2 === 0 ? 1 : -1;
    let a = chir * Math.atan2(y - cy, x - cx);
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    return a;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const mapX = 20, mapY = 40, mapW = w - 40, mapH = h - 80;
    const thetaR = (this.theta * Math.PI) / 180;
    const step = 3;
    for (let y = 0; y < mapH; y += step) {
      for (let x = 0; x < mapW; x += step) {
        const ori = this.orientation(x, y);
        const r = 0.5 * (1 + Math.cos(2 * (ori - thetaR)));
        const hue = (ori / Math.PI) * 360;
        const light = 16 + 66 * r;
        ctx.fillStyle = `hsl(${hue.toFixed(0)}, 68%, ${light.toFixed(0)}%)`;
        ctx.fillRect(mapX + x, mapY + y, step, step);
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(mapX, mapY, mapW, mapH);

    // Caption + stimulus bar.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('hue = preferred orientation · brightness = response to the stimulus bar', mapX, mapY - 8);

    const bx = w - 70, by = 70, bl = 26;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(thetaR);
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-bl, 0); ctx.lineTo(bl, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText(`stimulus ${this.theta}°`, w - 20, h - 14);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new OrientationColumns());
