import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const N_FLAKES = 320;
function rng(i: number): number { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
// hue shift across the spectrum as the viewing angle sweeps — pearlescent travel
function micaHue(viewDeg: number, flakeDeg: number): number {
  const rel = ((viewDeg - flakeDeg) + 360) % 360;
  return (180 + rel) % 360;            // 0° → blueish, sweeps through hues
}
function hslHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2; const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

class MetallicFlake {
  private stage: CanvasStage;
  private angle = 60;
  private ink = 'aluminum';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.angle = hydrateNumber('angle', 60);
    this.ink = hydrateFromUrl('ink') ?? 'aluminum';
    const sa = document.getElementById('angle') as EncSlider;
    sa.value = this.angle;
    sa.addEventListener('input', (e) => { this.angle = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('angle', () => Math.round(this.angle));
    const ti = document.getElementById('ink') as EncToggle;
    ti.value = this.ink;
    ti.addEventListener('change', (e) => { this.ink = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ink', () => this.ink);
    document.addEventListener('reset-params', () => { this.angle = 60; this.ink = 'aluminum'; sa.value = 60; ti.value = 'aluminum'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const isMica = this.ink === 'mica';
    // base ink colour
    ctx.fillStyle = isMica ? '#d4d2cc' : '#7e8085'; ctx.fillRect(0, 0, w, h);
    const x0 = 40, y0 = 50, x1 = w - 40, y1 = h - 64, gw = x1 - x0, gh = y1 - y0;
    ctx.fillStyle = isMica ? '#dcd9d1' : '#8a8c91'; ctx.fillRect(x0, y0, gw, gh);

    let lit = 0;
    for (let i = 0; i < N_FLAKES; i++) {
      const fx = x0 + rng(i) * gw, fy = y0 + rng(i + 1) * gh;
      const flakeDeg = rng(i + 2) * 360;
      const diff = Math.cos(((this.angle - flakeDeg) * Math.PI) / 180);
      const intensity = Math.pow(Math.max(0, diff), 16);
      if (intensity < 0.04) continue;
      lit++;
      const r = 2.4 + rng(i + 3) * 3.0;
      const col = isMica ? hslHex(micaHue(this.angle, flakeDeg), 0.85, 0.45 + 0.4 * intensity) : `rgba(255,255,250,${intensity})`;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, gw, gh);

    ctx.fillStyle = isMica ? '#1a1714' : '#1a1714'; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(isMica
      ? `mica — ${lit} flakes catching the light, each throwing a different hue (angle ${Math.round(this.angle)}°)`
      : `aluminium — ${lit} of ${N_FLAKES} flakes flash neutral silver at this angle; the rest stay dark`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new MetallicFlake());
