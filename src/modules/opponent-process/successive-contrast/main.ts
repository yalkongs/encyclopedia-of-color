import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TAU = 2.2;     // recovery time constant (s)
const CYCLE = 9;     // loop length (s)

class SuccessiveContrast {
  private stage: CanvasStage;
  private hue = 120;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.hue = hydrateNumber('hue', 120);
    (document.getElementById('hue') as EncSlider).value = this.hue;
    registerStateParam('hue', () => this.hue);
    (document.getElementById('hue') as EncSlider).addEventListener('input', (e) => {
      this.hue = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.hue = 120;
      (document.getElementById('hue') as EncSlider).value = 120;
      notifyStateChange();
    });
    startAnimation((t) => this.draw(t));
  }

  private draw(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const tau = (t % CYCLE);
    const a = Math.exp(-tau / TAU);          // aftereffect strength 1→0
    const compHue = (this.hue + 180) % 360;

    // Test patch: white tinged toward complementary by strength a.
    const px = w * 0.12, py = 60, pw = w * 0.4, ph = h * 0.4;
    ctx.fillStyle = '#f4f1e6'; ctx.fillRect(px, py, pw, ph);
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = `hsl(${compHue}, 55%, 62%)`; ctx.fillRect(px, py, pw, ph);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('neutral patch (tinged by the aftereffect)', px, py - 10);

    // Adapting swatch (reference).
    const ax = w * 0.62, aw = w * 0.26;
    ctx.fillStyle = `hsl(${this.hue}, 78%, 50%)`; ctx.fillRect(ax, py, aw, ph * 0.5);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(ax, py, aw, ph * 0.5);
    ctx.fillStyle = theme.inkMute; ctx.fillText('adapting colour', ax, py - 10);

    // Recovery curve.
    const plotX = w * 0.12, plotW = w * 0.76, plotY = h * 0.62, plotH = h * 0.24;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const tt = (i / plotW) * CYCLE;
      const y = plotY + (1 - Math.exp(-tt / TAU)) * plotH;
      i === 0 ? ctx.moveTo(plotX + i, y) : ctx.lineTo(plotX + i, y);
    }
    ctx.stroke();
    const mxp = plotX + (tau / CYCLE) * plotW;
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(mxp, plotY + (1 - a) * plotH, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('aftereffect strength →  time', plotX + 4, plotY - 6);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`tint ${(a * 100).toFixed(0)}% of the way to ${compHue}°`, plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new SuccessiveContrast());
