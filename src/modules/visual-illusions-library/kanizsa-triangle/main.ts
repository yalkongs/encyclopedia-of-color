import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Kanizsa {
  private stage: CanvasStage;
  private align = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.align = hydrateNumber('align', 0);
    (document.getElementById('align') as EncSlider).value = this.align;
    registerStateParam('align', () => this.align);
    (document.getElementById('align') as EncSlider).addEventListener('input', (e) => {
      this.align = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.align = 0;
      (document.getElementById('align') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5, cy = h * 0.52;
    const Rt = Math.min(w, h) * 0.3;
    const rp = Rt * 0.42;
    const rot = (this.align * Math.PI) / 180;

    for (let i = 0; i < 3; i++) {
      const va = (-90 + i * 120) * Math.PI / 180;
      const vx = cx + Rt * Math.cos(va), vy = cy + Rt * Math.sin(va);
      const toC = Math.atan2(cy - vy, cx - vx) + rot; // mouth direction (+ slider offset)
      const half = Math.PI / 6; // 60° mouth
      ctx.fillStyle = '#16161c';
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.arc(vx, vy, rp, toC + half, toC - half + 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.align === 0 ? 'a triangle floats above the page — yet none is drawn' : 'inducers misaligned — the triangle dissolves', cx, h - 14);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new Kanizsa());
