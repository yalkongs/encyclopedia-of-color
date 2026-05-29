import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class RefreshRate {
  private stage: CanvasStage;
  private hz = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.hz = Number(hydrateFromUrl('hz') ?? 60);
    const t = document.getElementById('hz') as EncToggle;
    t.value = String(this.hz);
    t.addEventListener('change', (e) => { this.hz = Number((e as CustomEvent).detail.value); notifyStateChange(); });
    registerStateParam('hz', () => this.hz);
    document.addEventListener('reset-params', () => { this.hz = 60; t.value = '60'; notifyStateChange(); });
    startAnimation((tSec) => this.draw(tSec));
  }

  private xAt(t: number, w: number): number {
    const margin = 80, span = w - 2 * margin;
    const period = 2.2; // seconds per sweep
    const ph = (t % period) / period;
    return margin + span * (0.5 - 0.5 * Math.cos(ph * 2 * Math.PI));
  }

  private draw(tSec: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, w, h);
    const yC = h * 0.5, r = 18;
    // ghost trail: positions at the last frames sampled at this.hz over ~120ms
    const dt = 1 / this.hz, window = 0.13;
    const n = Math.floor(window / dt);
    for (let k = n; k >= 1; k--) {
      const x = this.xAt(tSec - k * dt, w);
      const a = 0.5 * (1 - k / (n + 1));
      ctx.beginPath(); ctx.arc(x, yC, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(120,160,230,${a})`; ctx.fill();
    }
    // current
    const x = this.xAt(tSec, w);
    ctx.beginPath(); ctx.arc(x, yC, r, 0, Math.PI * 2); ctx.fillStyle = '#e8eaf2'; ctx.fill();

    ctx.fillStyle = 'rgba(236,234,242,0.7)'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${this.hz} Hz — ${n} frames per ${(window * 1000) | 0} ms`, 30, 40);
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.hz >= 240 ? 'tight, closely spaced steps — smooth motion' : this.hz >= 120 ? 'steps closing up — noticeably smoother' : 'widely spaced ghosts — visible judder', w / 2, h - 18);
    void axisStyle;
  }
}
window.addEventListener('DOMContentLoaded', () => new RefreshRate());
