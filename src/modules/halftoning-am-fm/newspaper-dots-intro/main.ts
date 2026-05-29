import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { clusteredScreen } from '@core/render/halftone';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class NewsprintDots {
  private stage: CanvasStage;
  private pitch = 14;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pitch = hydrateNumber('pitch', 14);
    const s = document.getElementById('pitch') as EncSlider;
    s.value = this.pitch;
    s.addEventListener('input', (e) => { this.pitch = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pitch', () => Math.round(this.pitch));
    document.addEventListener('reset-params', () => { this.pitch = 14; s.value = 14; this.draw(); notifyStateChange(); });
  }

  // a shaded sphere on a gradient background → ink coverage 0..1 (1 = black)
  private coverage(x: number, y: number, w: number, h: number): number {
    const bg = 0.12 + 0.42 * (x / w);
    const cx = w * 0.46, cy = h * 0.5, R = Math.min(w, h) * 0.34;
    const dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy;
    if (r2 > 1) return bg;
    const nz = Math.sqrt(1 - r2);
    const light = Math.max(0.04, (-0.5 * dx - 0.55 * dy + 0.7 * nz) / 1.2); // lit from upper-left
    return Math.max(0, Math.min(1, 1 - (0.12 + 0.9 * light)));
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 30, x1 = w - 30, y1 = h - 60;
    clusteredScreen(ctx, x0, y0, x1, y1, this.pitch, 45, '#1a1714',
      (x, y) => this.coverage(x - x0, y - y0, x1 - x0, y1 - y0), { bg: '#f7f5ef' });
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.pitch)} px screen — pure black dots; their area, not their colour, makes the greys`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new NewsprintDots());
