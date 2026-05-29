import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const SECTORS = 72;

class ChevreulCircle {
  private stage: CanvasStage;
  private hue = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 0);
    const el = document.getElementById('hue') as EncSlider;
    el.value = this.hue;
    el.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    document.addEventListener('reset-params', () => { this.hue = 0; el.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    // 72-sector circle on the left
    const cx = Math.min(w * 0.32, h * 0.5), cy = h * 0.5, R = Math.min(w * 0.3, h * 0.4);
    for (let i = 0; i < SECTORS; i++) {
      const a0 = -Math.PI / 2 + (i / SECTORS) * Math.PI * 2;
      const a1 = -Math.PI / 2 + ((i + 1) / SECTORS) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = `hsl(${i * 5}, 68%, 50%)`; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2); ctx.fillStyle = theme.paper; ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.stroke();

    const mark = (hueDeg: number, label: string, color: string) => {
      const a = -Math.PI / 2 + (hueDeg / 360) * Math.PI * 2;
      const x = cx + R * 1.04 * Math.cos(a), y = cy + R * 1.04 * Math.sin(a);
      ctx.beginPath(); ctx.moveTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.lineTo(x, y); ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = color; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, x + 12 * Math.cos(a), y + 12 * Math.sin(a));
    };
    mark(this.hue, 'surround', theme.ink);
    mark((this.hue + 180) % 360, 'complement', theme.crimson);

    // simultaneous contrast demo on the right
    const surround = `hsl(${this.hue}, 68%, 50%)`;
    const grey = 'rgb(150,150,150)';
    const dx = w * 0.66, fieldS = Math.min(w * 0.28, h * 0.36), gy = h * 0.5 - fieldS - 12;
    // grey on neutral field
    ctx.fillStyle = theme.paperRecess; ctx.fillRect(dx, gy, fieldS, fieldS);
    ctx.fillStyle = grey; ctx.fillRect(dx + fieldS * 0.3, gy + fieldS * 0.3, fieldS * 0.4, fieldS * 0.4);
    // grey on coloured field
    const gy2 = h * 0.5 + 12;
    ctx.fillStyle = surround; ctx.fillRect(dx, gy2, fieldS, fieldS);
    ctx.fillStyle = grey; ctx.fillRect(dx + fieldS * 0.3, gy2 + fieldS * 0.3, fieldS * 0.4, fieldS * 0.4);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('grey on neutral', dx + fieldS / 2, gy - 6);
    ctx.fillText('same grey on surround', dx + fieldS / 2, gy2 - 6);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('both greys are identical — your eye tints the lower one toward the complement', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ChevreulCircle());
