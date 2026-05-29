import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const temp = (hue: number) => Math.cos((hue - 30) * Math.PI / 180); // +1 warm (orange), -1 cool (blue-green)

class CoolWarm {
  private stage: CanvasStage;
  private h1 = 30; private h2 = 210;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.h1 = hydrateNumber('h1', 30); this.h2 = hydrateNumber('h2', 210);
    for (const k of ['h1', 'h2'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.h1 = 30; this.h2 = 210; (document.getElementById('h1') as EncSlider).value = 30; (document.getElementById('h2') as EncSlider).value = 210; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // warm-cool gradient axis
    const x0 = 60, barW = w - 120, by = 90, barH = 40;
    const grad = ctx.createLinearGradient(x0, 0, x0 + barW, 0);
    grad.addColorStop(0, 'hsl(195,60%,45%)'); grad.addColorStop(0.5, 'hsl(120,8%,62%)'); grad.addColorStop(1, 'hsl(28,75%,52%)');
    ctx.fillStyle = grad; ctx.fillRect(x0, by, barW, barH);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, by, barW, barH);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('cool · blue-green', x0, by - 8); ctx.textAlign = 'right'; ctx.fillText('warm · orange-red', x0 + barW, by - 8);

    const xAt = (hue: number) => x0 + ((temp(hue) + 1) / 2) * barW;
    const swatch = (hue: number, label: string, sy: number) => {
      const t = temp(hue);
      const mx = xAt(hue);
      ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, by); ctx.lineTo(mx, by + barH); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, by + barH + 8, 4, 0, Math.PI * 2); ctx.fillStyle = theme.ink; ctx.fill();
      // swatch
      ctx.fillStyle = `hsl(${hue},70%,50%)`; ctx.fillRect(x0 + (label === 'A' ? 0 : barW - 130), sy, 130, 70);
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0 + (label === 'A' ? 0 : barW - 130), sy, 130, 70);
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = label === 'A' ? 'left' : 'right';
      const tx = label === 'A' ? x0 : x0 + barW;
      ctx.fillText(`${label}: hue ${Math.round(hue)}° · temp ${t >= 0 ? '+' : ''}${t.toFixed(2)}`, tx, sy + 86);
    };
    swatch(this.h1, 'A', by + barH + 40);
    swatch(this.h2, 'B', by + barH + 40);

    const dT = Math.abs(temp(this.h1) - temp(this.h2));
    ctx.fillStyle = theme.crimson; ctx.font = '700 24px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`warm-cool contrast Δ ${dT.toFixed(2)}`, w / 2, h - 40);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(dT > 1.4 ? 'a strong warm-cool opposition — one advances, the other recedes' : 'a mild temperature difference', w / 2, h - 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new CoolWarm());
