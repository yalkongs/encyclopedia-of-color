import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TILE = 48, MORTAR = '#8a8a82';

class CafeWall {
  private stage: CanvasStage;
  private offset = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.offset = hydrateNumber('offset', 50);
    (document.getElementById('offset') as EncSlider).value = this.offset;
    registerStateParam('offset', () => this.offset);
    (document.getElementById('offset') as EncSlider).addEventListener('input', (e) => {
      this.offset = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.offset = 50;
      (document.getElementById('offset') as EncSlider).value = 50;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = MORTAR; ctx.fillRect(0, 0, w, h);

    const gx = 30, gy = 44, gw = w - 60, gh = h - 100;
    const rows = Math.floor(gh / TILE);
    const off = (this.offset / 100) * TILE;
    const mortarH = 3;

    for (let r = 0; r < rows; r++) {
      const y = gy + r * TILE;
      const shift = (r % 2) * off;
      for (let x = -TILE; x < gw + TILE; x += TILE) {
        const idx = Math.floor((x) / TILE);
        ctx.fillStyle = idx % 2 === 0 ? '#111118' : '#f2eee2';
        const tx = gx + x + shift;
        ctx.fillRect(tx, y + mortarH, TILE, TILE - mortarH);
      }
    }
    // Clip overflow with paper margins.
    ctx.fillStyle = theme.paperBg;
    ctx.fillRect(0, 0, gx, h); ctx.fillRect(gx + gw, 0, w - gx - gw, h);
    ctx.fillRect(0, 0, w, gy); ctx.fillRect(0, gy + rows * TILE, w, h);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.offset > 20 && this.offset < 80 ? 'the rows look wedged — but every one is level' : 'rows aligned — no tilt', w / 2, h - 14);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new CafeWall());
