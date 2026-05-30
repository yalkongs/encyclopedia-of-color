import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ApertureDoF {
  private stage: CanvasStage;
  private fstop = 40; // ×10 → actual f-stop

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.fstop = hydrateNumber('fstop', 40);
    const s = document.getElementById('fstop') as EncSlider;
    s.value = this.fstop;
    s.addEventListener('input', (e) => { this.fstop = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('fstop', () => Math.round(this.fstop));
    document.addEventListener('reset-params', () => { this.fstop = 40; s.value = 40; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const f = this.fstop / 10;
    // blur radius: small at f/22, large at f/1.4
    const blurPx = Math.max(0, 18 - 14 * Math.log2(f / 1.4) / Math.log2(22 / 1.4));

    // background: textured grass/foliage
    ctx.save();
    if (blurPx > 0) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
    ctx.fillStyle = '#2c4a2c'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 240; i++) {
      const x = (i * 113) % w, y = ((i * 71) % h) * 0.85 + h * 0.12;
      ctx.fillStyle = `hsl(${100 + ((i * 17) % 40)}, 35%, ${22 + ((i * 23) % 30)}%)`;
      ctx.fillRect(x, y, 4 + (i % 5), 22 + (i % 18));
    }
    // a few bright highlights — turn into bokeh discs when blurred
    for (let k = 0; k < 8; k++) {
      const bx = (k * 137 + 40) % w, by = (k * 53 + 80) % h;
      ctx.fillStyle = 'rgba(255,240,180,0.7)';
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // foreground subject — a sharp flower (focal plane)
    const cx = w * 0.42, cy = h * 0.55;
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(cx - 6, cy + 20, 12, h * 0.35);
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2, pr = 38;
      ctx.fillStyle = `hsl(${320 + p * 4}, 80%, 60%)`;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr * 0.9, 22, 14, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();

    // aperture HUD
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(20, 20, 150, 40);
    ctx.fillStyle = '#f4ecd6'; ctx.font = '15px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`aperture  f/${f.toFixed(1)}`, 30, 46);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(f <= 2.8 ? 'wide open — shallow depth of field, background melts' : f >= 11 ? 'stopped down — deep focus, background sharpens' : `f/${f.toFixed(1)} — medium depth of field`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new ApertureDoF());
