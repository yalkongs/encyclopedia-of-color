import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PrintVsScreen {
  private stage: CanvasStage;
  private ambient = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ambient = hydrateNumber('ambient', 60);
    const s = document.getElementById('ambient') as EncSlider;
    s.value = this.ambient;
    s.addEventListener('input', (e) => { this.ambient = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ambient', () => Math.round(this.ambient));
    document.addEventListener('reset-params', () => { this.ambient = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const env = Math.round((this.ambient / 100) * 20);                  // dim room background
    ctx.fillStyle = `rgb(${env},${env},${env + 2})`; ctx.fillRect(0, 0, w, h);

    const pad = 40, gap = 24, pw = (w - pad * 2 - gap) / 2, py = 60, ph = h - 150;
    // Paper (reflective): brightness scales with ambient
    const k = this.ambient / 100;
    const r = Math.round(248 * k), g = Math.round(243 * k), b = Math.round(232 * k);
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(pad, py, pw, ph);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(pad, py, pw, ph);
    // ink on the page (reflective too, scales with ambient)
    ctx.fillStyle = `rgb(${Math.round(30 * k)},${Math.round(30 * k)},${Math.round(28 * k)})`;
    ctx.font = `700 ${ph * 0.18}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('paper', pad + pw / 2, py + ph * 0.45);
    ctx.font = `400 ${ph * 0.07}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText('lit only by the room', pad + pw / 2, py + ph * 0.62);

    // Screen (emissive): constant emission regardless of ambient
    const sx = pad + pw + gap;
    ctx.fillStyle = '#13191e'; ctx.fillRect(sx, py, pw, ph);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(sx, py, pw, ph);
    ctx.fillStyle = '#f4ecd6'; ctx.font = `700 ${ph * 0.18}px Georgia, serif`; ctx.textAlign = 'center';
    ctx.fillText('screen', sx + pw / 2, py + ph * 0.45);
    ctx.font = `400 ${ph * 0.07}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = '#cdc4ac'; ctx.fillText('makes its own light', sx + pw / 2, py + ph * 0.62);

    ctx.fillStyle = '#e6e3da'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('reflective', pad + pw / 2, py - 12);
    ctx.fillText('emissive', sx + pw / 2, py - 12);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.ambient < 25
      ? 'lights down — the page vanishes, the screen still glows'
      : this.ambient > 80
        ? 'lights up — the page sings, the screen flattens under glare'
        : `ambient ${Math.round(this.ambient)}% — paper tracks the room, the screen does not`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PrintVsScreen());
