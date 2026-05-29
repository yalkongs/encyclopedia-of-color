import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { reinhardExtended } from '@core/math/tonemap';

const FILM_PEAK = 4000; // mastering peak that HDR10's static curve is sized for
const SCENES = [
  { name: 'sunset — bright exterior', peak: 4000 },
  { name: 'interior — dim, candlelit', peak: 260 },
];

class DolbyVision {
  private stage: CanvasStage;
  private mode = 'hdr10';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.mode = hydrateFromUrl('mode') ?? 'hdr10';
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.mode = 'hdr10'; t.value = 'hdr10'; this.draw(); notifyStateChange(); });
  }

  // scene nits -> display 0..1, using the curve sized for `curvePeak`
  private toneMap(sceneNits: number, curvePeak: number): number {
    const x = sceneNits / (curvePeak / 4); // curvePeak lands near the shoulder
    return Math.max(0, Math.min(1, reinhardExtended(x, 4) / reinhardExtended(4, 4)));
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 40, gw = w - 80;
    const rowH = 90, gap = 56;
    const top0 = 56;
    const enc = (d01: number) => Math.round(Math.pow(Math.max(0, Math.min(1, d01)), 1 / 2.2) * 255);

    SCENES.forEach((sc, i) => {
      const curvePeak = this.mode === 'hdr10' ? FILM_PEAK : sc.peak;
      const top = top0 + i * (rowH + gap);
      // gradient: position 0..1 maps to scene luminance 0..sc.peak
      let usedMax = 0;
      for (let px = 0; px < gw; px++) {
        const sceneNits = (px / gw) * sc.peak;
        const d01 = this.toneMap(sceneNits, curvePeak);
        usedMax = Math.max(usedMax, d01);
        const g = enc(d01);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(gx + px, top, 1, rowH);
      }
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(gx, top, gw, rowH);
      ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${sc.name}  ·  mastered to ${sc.peak} nits`, gx, top - 10);
      ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'right';
      ctx.fillText(`peak output ≈ ${(usedMax * 100).toFixed(0)}% of display`, gx + gw, top - 10);
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.mode === 'hdr10'
      ? `HDR10 — one curve sized for ${FILM_PEAK} nits; the dim interior never fills the display`
      : `Dolby Vision — each scene's curve is refit to its own peak, so the interior brightens to use the panel`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new DolbyVision());
