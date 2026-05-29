import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const HZ = 60, TAU = 0.0018; // phosphor decay time constant

class PanelCrtLcd {
  private stage: CanvasStage;
  private type = 'crt';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.type = hydrateFromUrl('type') ?? 'crt';
    const t = document.getElementById('type') as EncToggle;
    t.value = this.type;
    t.addEventListener('change', (e) => { this.type = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('type', () => this.type);
    document.addEventListener('reset-params', () => { this.type = 'crt'; t.value = 'crt'; notifyStateChange(); });
    startAnimation((tSec) => this.draw(tSec));
  }

  private out(t: number): number { // light 0..1 within a refresh period
    const ph = (t % (1 / HZ)) * HZ; // 0..1 within frame
    if (this.type === 'lcd') return 0.7;
    const tt = ph / HZ; // seconds into frame
    return Math.exp(-tt / TAU);
  }

  private draw(tSec: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // pixel swatch (current brightness)
    const lv = this.out(tSec);
    const g = Math.round(lv * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`; const sx = 40, sy = 50, ss = 90;
    ctx.fillRect(sx, sy, ss, ss); ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, ss, ss);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('the pixel now', sx + ss / 2, sy + ss + 16);

    // light-vs-time plot over ~3 frames
    const px = 180, py = 50, pw = w - px - 40, ph = h - 140;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('light output', px, py - 8); ctx.fillText('time (3 frames @ 60 Hz)', px + pw - 160, py + ph + 16);
    const frames = 3, span = frames / HZ;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= pw; i++) { const tt = (i / pw) * span; const Y = py + ph - this.out(tt) * ph; i === 0 ? ctx.moveTo(px + i, Y) : ctx.lineTo(px + i, Y); }
    ctx.stroke();
    // frame boundaries
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.setLineDash([3, 3]);
    for (let f = 1; f < frames; f++) { const x = px + (f / frames) * pw; ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke(); } ctx.setLineDash([]);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.type === 'crt' ? 'impulse + phosphor decay — flickers, but motion stays crisp' : 'steady sample-and-hold — flicker-free, but motion can blur', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PanelCrtLcd());
