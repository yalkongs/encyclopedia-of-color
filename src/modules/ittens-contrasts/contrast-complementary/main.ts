import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function hslRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const css = (c: number[]) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

class Complementary {
  private stage: CanvasStage;
  private hue = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 20);
    const el = document.getElementById('hue') as EncSlider;
    el.value = this.hue;
    el.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    document.addEventListener('reset-params', () => { this.hue = 20; el.value = 20; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const a = hslRgb(this.hue, 0.72, 0.5), b = hslRgb((this.hue + 180) % 360, 0.72, 0.5);
    const mix = a.map((v, i) => (v + b[i]) / 2) as [number, number, number];

    const x0 = 40, y0 = 40, fw = (w - 80) / 2, fh = h - 150;
    ctx.fillStyle = css(a); ctx.fillRect(x0, y0, fw, fh);
    ctx.fillStyle = css(b); ctx.fillRect(x0 + fw, y0, fw, fh);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, fw * 2, fh);
    ctx.strokeStyle = theme.paperBg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + fw, y0); ctx.lineTo(x0 + fw, y0 + fh); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`hue ${Math.round(this.hue)}°`, x0 + fw / 2, y0 + fh - 12);
    ctx.fillText(`complement ${Math.round((this.hue + 180) % 360)}°`, x0 + fw * 1.5, y0 + fh - 12);

    // mix strip
    const my = y0 + fh + 14, mh = 50;
    ctx.fillStyle = css(mix); ctx.fillRect(x0 + fw * 0.5, my, fw, mh);
    ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(x0 + fw * 0.5, my, fw, mh);
    const chroma = Math.max(...mix) - Math.min(...mix);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('optical average of the pair', x0 + fw, my + mh + 16);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(chroma < 8 ? 'the mix is neutral grey — the pair cancels exactly, a true complementary contrast'
      : 'the mix retains a faint cast — near-complementary', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Complementary());
