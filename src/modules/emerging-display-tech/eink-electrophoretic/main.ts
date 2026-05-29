import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// deterministic per-particle horizontal jitter
function rng(i: number): number { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

class EInk {
  private stage: CanvasStage;
  private voltage = -100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.voltage = hydrateNumber('voltage', -100);
    const s = document.getElementById('voltage') as EncSlider;
    s.value = this.voltage;
    s.addEventListener('input', (e) => { this.voltage = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('voltage', () => Math.round(this.voltage));
    document.addEventListener('reset-params', () => { this.voltage = -100; s.value = -100; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const t = (this.voltage + 100) / 200; // 0 = white surface, 1 = black surface
    const reflect = 1 - t;

    // page surface (viewer side)
    const px = 50, py = 36, pw = w - 100, ph = 70;
    const g = Math.round(reflect * 230 + 12);
    ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = theme.inkAlpha(0.35); ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('page surface (reflected light)', px, py - 10);

    // cross-section of capsules between two electrodes
    const cy0 = py + ph + 50, ch = h - cy0 - 70;
    const topY = cy0, botY = cy0 + ch;
    // electrodes
    ctx.fillStyle = theme.slate; ctx.fillRect(px, topY - 10, pw, 8); ctx.fillRect(px, botY + 2, pw, 8);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(this.voltage <= 0 ? '− (top)' : '+ (top)', px - 6, topY);
    ctx.fillText(this.voltage <= 0 ? '+ (back)' : '− (back)', px - 6, botY + 8);

    const n = Math.max(3, Math.floor(pw / 120));
    const cw = pw / n, r = Math.min(cw, ch) * 0.42;
    for (let c = 0; c < n; c++) {
      const cx = px + c * cw + cw / 2, cyc = (topY + botY) / 2;
      // capsule
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(cx, cyc, r, ch * 0.46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.stroke();
      // particles: black biased toward top by t, white toward top by (1-t)
      const place = (count: number, towardTopFrac: number, color: string, seed: number) => {
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
          const rx = (rng(seed + i) - 0.5) * 1.5 * r;
          const band = rng(seed + i + 99); // 0..1 within its cluster
          const topGroup = i / count < towardTopFrac;
          const yy = topGroup
            ? topY + 6 + band * (ch * 0.42)
            : botY - 6 - band * (ch * 0.42);
          ctx.beginPath(); ctx.arc(cx + rx, yy, 4.2, 0, Math.PI * 2); ctx.fill();
        }
      };
      place(12, t, '#15130f', c * 1000 + 1);        // black pigment up by t
      place(12, 1 - t, '#f3efe6', c * 1000 + 500);  // white pigment up by (1-t)
    }

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.voltage === 0
      ? 'zero volts — whatever was last written simply stays (bistable, no power needed)'
      : `${this.voltage > 0 ? 'black' : 'white'} pigment driven to the surface → ${(reflect * 100).toFixed(0)}% reflectance`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new EInk());
