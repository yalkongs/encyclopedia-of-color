import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Foveated {
  private stage: CanvasStage;
  private gaze = 50;
  private strength = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.gaze = hydrateNumber('gaze', 50);
    this.strength = hydrateNumber('strength', 60);
    const g = document.getElementById('gaze') as EncSlider;
    g.value = this.gaze;
    g.addEventListener('input', (e) => { this.gaze = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('gaze', () => Math.round(this.gaze));
    const s = document.getElementById('strength') as EncSlider;
    s.value = this.strength;
    s.addEventListener('input', (e) => { this.strength = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('strength', () => Math.round(this.strength));
    document.addEventListener('reset-params', () => { this.gaze = 50; this.strength = 60; g.value = 50; s.value = 60; this.draw(); notifyStateChange(); });
  }

  // high-frequency colour pattern in normalised coords
  private content(u: number, v: number): [number, number, number] {
    const hue = (Math.atan2(v - 0.5, u - 0.5) / (Math.PI * 2) + 0.5) * 360;
    const ring = 0.5 + 0.5 * Math.cos(Math.hypot(u - 0.5, v - 0.5) * 90);
    const checker = ((Math.floor(u * 60) + Math.floor(v * 60)) % 2) === 0 ? 1 : 0.55;
    const l = (0.35 + 0.5 * ring) * checker;
    // hsl->rgb (s=0.7)
    const c = (1 - Math.abs(2 * l - 1)) * 0.7, hp = hue / 60, x = c * (1 - Math.abs((hp % 2) - 1)), m = l - c / 2;
    let r = 0, gg = 0, b = 0;
    if (hp < 1) [r, gg, b] = [c, x, 0]; else if (hp < 2) [r, gg, b] = [x, c, 0]; else if (hp < 3) [r, gg, b] = [0, c, x];
    else if (hp < 4) [r, gg, b] = [0, x, c]; else if (hp < 5) [r, gg, b] = [x, 0, c]; else [r, gg, b] = [c, 0, x];
    return [(r + m) * 255, (gg + m) * 255, (b + m) * 255];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, w, h);
    const x0 = 36, y0 = 36, sw = w - 72, sh = h - 96;
    const gazeX = x0 + (this.gaze / 100) * sw, gazeY = y0 + sh * 0.5;
    const k = (this.strength / 100) * 22;   // falloff steepness
    const e0 = Math.min(sw, sh) * 0.14;     // foveal radius
    const minPx = 2;

    let densitySum = 0, samples = 0;
    const step = 2;
    for (let py = 0; py < sh; py += step) {
      for (let px = 0; px < sw; px += step) {
        const dx = (x0 + px) - gazeX, dy = (y0 + py) - gazeY;
        const e = Math.hypot(dx, dy);
        const blockPx = Math.max(minPx, minPx + k * (e / e0) ** 2);
        // snap to block grid (foveated sampling)
        const bx = Math.floor(px / blockPx) * blockPx + blockPx / 2;
        const by = Math.floor(py / blockPx) * blockPx + blockPx / 2;
        const [r, g, b] = this.content(bx / sw, by / sh);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x0 + px, y0 + py, step + 0.5, step + 0.5);
        densitySum += 1 / (blockPx * blockPx); samples++;
      }
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, sw, sh);

    // gaze marker
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gazeX, gazeY, e0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gazeX - 10, gazeY); ctx.lineTo(gazeX + 10, gazeY); ctx.moveTo(gazeX, gazeY - 10); ctx.lineTo(gazeX, gazeY + 10); ctx.stroke();

    const renderedFrac = densitySum / samples; // ~ fraction of full-res samples actually drawn
    const saved = Math.max(0, 1 - renderedFrac);
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`crisp at the gaze ring, coarse in the periphery — about ${(saved * 100).toFixed(0)}% of pixel work saved`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Foveated());
