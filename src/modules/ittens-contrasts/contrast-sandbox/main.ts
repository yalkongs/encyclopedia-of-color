import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

type Tile = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;
const NAMES = ['Contrast of hue', 'Light-dark', 'Cold-warm', 'Complementary', 'Simultaneous', 'Saturation', 'Extension'];
const IDEAS = [
  'pure primaries at full strength',
  'value distance, white to black',
  'orange-red warm vs blue-green cool',
  'opposites intensify, mix to grey',
  'a field tints a neutral toward its complement',
  'vivid beside muted, same hue',
  'area balances intensity (Goethe ratios)',
];
const TILES: Tile[] = [
  (c, x, y, w, h) => { const hs = [0, 60, 220]; hs.forEach((hue, i) => { c.fillStyle = `hsl(${hue},85%,50%)`; c.fillRect(x + i * w / 3, y, w / 3, h); }); },
  (c, x, y, w, h) => { for (let i = 0; i < 5; i++) { const g = 255 - i * 56; c.fillStyle = `rgb(${g},${g},${g})`; c.fillRect(x + i * w / 5, y, w / 5, h); } },
  (c, x, y, w, h) => { c.fillStyle = 'hsl(28,75%,50%)'; c.fillRect(x, y, w / 2, h); c.fillStyle = 'hsl(195,65%,48%)'; c.fillRect(x + w / 2, y, w / 2, h); },
  (c, x, y, w, h) => { c.fillStyle = 'hsl(20,72%,50%)'; c.fillRect(x, y, w / 2, h); c.fillStyle = 'hsl(200,72%,50%)'; c.fillRect(x + w / 2, y, w / 2, h); },
  (c, x, y, w, h) => { c.fillStyle = 'hsl(120,60%,45%)'; c.fillRect(x, y, w, h); c.fillStyle = 'rgb(170,170,170)'; c.fillRect(x + w * 0.35, y + h * 0.3, w * 0.3, h * 0.4); },
  (c, x, y, w, h) => { c.fillStyle = 'hsl(0,80%,50%)'; c.fillRect(x, y, w / 2, h); c.fillStyle = 'hsl(0,22%,52%)'; c.fillRect(x + w / 2, y, w / 2, h); },
  (c, x, y, w, h) => { c.fillStyle = 'hsl(55,85%,52%)'; c.fillRect(x, y, w * 0.75, h); c.fillStyle = 'hsl(275,55%,40%)'; c.fillRect(x + w * 0.75, y, w * 0.25, h); },
];

class Sandbox {
  private stage: CanvasStage;
  private pick = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pick = hydrateNumber('pick', 1);
    const el = document.getElementById('pick') as EncSlider;
    el.value = this.pick;
    el.addEventListener('input', (e) => { this.pick = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pick', () => Math.round(this.pick));
    document.addEventListener('reset-params', () => { this.pick = 1; el.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const sel = Math.round(this.pick) - 1;

    // big selected tile
    const bx = 30, by = 30, bw = w - 60, bh = h * 0.42;
    TILES[sel](ctx, bx, by, bw, bh);
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = theme.crimson; ctx.font = '700 22px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`${sel + 1}. ${NAMES[sel]}`, bx, by + bh + 28);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(IDEAS[sel], bx, by + bh + 48);

    // thumbnail row
    const ty = h - 80, tw = (w - 60 - 6 * 8) / 7, th = 50;
    for (let i = 0; i < 7; i++) {
      const tx = 30 + i * (tw + 8);
      TILES[i](ctx, tx, ty, tw, th);
      ctx.strokeStyle = i === sel ? theme.crimson : axisStyle.baseline; ctx.lineWidth = i === sel ? 2.2 : 1;
      ctx.strokeRect(tx, ty, tw, th);
      ctx.fillStyle = i === sel ? theme.crimson : theme.inkHint; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), tx + tw / 2, ty + th + 14);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new Sandbox());
