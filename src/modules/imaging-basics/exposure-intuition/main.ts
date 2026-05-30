import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// scene radiance (0..1) at normalised coords — a tonal landscape with sky, ground, dark trees
function scene(u: number, v: number): number {
  if (v < 0.45) return 0.78 - v * 0.4;                                // bright sky gradient
  if (v < 0.55) return 0.55 - (v - 0.45) * 2;                         // horizon mountains
  // ground with a few dark blobs
  let g = 0.32 + Math.sin(u * 9 + v * 3) * 0.04;
  const tree = Math.exp(-(((u - 0.7) ** 2 + (v - 0.78) ** 2) * 60));
  g = Math.max(0.04, g - tree * 0.25);
  return g;
}

class ExposureIntuition {
  private stage: CanvasStage;
  private ev = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ev = hydrateNumber('ev', 0);
    const s = document.getElementById('ev') as EncSlider;
    s.value = this.ev;
    s.addEventListener('input', (e) => { this.ev = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ev', () => this.ev.toFixed(1));
    document.addEventListener('reset-params', () => { this.ev = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gain = Math.pow(2, this.ev);

    // image
    const x0 = 40, y0 = 36, iw = w - 80, ih = h - 220, cell = 3;
    const bins = new Array(32).fill(0); let shadowClip = 0, highClip = 0, total = 0;
    for (let py = 0; py < ih; py += cell) for (let px = 0; px < iw; px += cell) {
      const u = px / iw, v = py / ih;
      const r = Math.max(0, Math.min(1, scene(u, v) * gain));
      if (r <= 0.01) shadowClip++; if (r >= 0.99) highClip++; total++;
      const g = Math.round(Math.pow(r, 1 / 2.2) * 255);
      ctx.fillStyle = `rgb(${g},${g},${Math.min(255, g + 6)})`;
      ctx.fillRect(x0 + px, y0 + py, cell + 0.5, cell + 0.5);
      bins[Math.min(31, Math.floor(r * 32))]++;
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, iw, ih);

    // histogram
    const hx = x0, hy = y0 + ih + 30, hw = iw, hh = 100, mx = Math.max(...bins);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(hx, hy, hw, hh);
    for (let i = 0; i < 32; i++) {
      const bh = (bins[i] / mx) * (hh - 4);
      ctx.fillStyle = i === 0 ? '#9b2828' : i === 31 ? '#9b2828' : theme.slate;
      ctx.fillRect(hx + i * (hw / 32) + 1, hy + hh - bh - 1, hw / 32 - 2, bh);
    }
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('shadow', hx, hy + hh + 14); ctx.textAlign = 'right'; ctx.fillText('highlight', hx + hw, hy + hh + 14);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const sh = (shadowClip / total) * 100, hi = (highClip / total) * 100;
    const tag = this.ev <= -1.5 ? 'underexposed — shadows crushing' : this.ev >= 1.5 ? 'overexposed — highlights clipping' : 'well exposed';
    ctx.fillText(`${this.ev >= 0 ? '+' : ''}${this.ev.toFixed(1)} EV · ${tag} · shadow clip ${sh.toFixed(0)}% · highlight clip ${hi.toFixed(0)}%`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ExposureIntuition());
