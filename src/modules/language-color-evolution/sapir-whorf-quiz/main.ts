import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function hueRGB(h: number): [number, number, number] {
  const c = 0.6, hp = (h % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + 0.3) * 255, (g + 0.3) * 255, (b + 0.4) * 255];
}

class SapirWhorf {
  private stage: CanvasStage;
  private hue = 220;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 220);
    const s = document.getElementById('hue') as EncSlider; s.value = this.hue;
    s.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    document.addEventListener('reset-params', () => { this.hue = 220; s.value = 220; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const isSiniy = this.hue >= 225; // dark blue
    const ruName = isSiniy ? 'siniy (синий)' : 'goluboy (голубой)';
    const enName = 'blue';
    const rgb = hueRGB(this.hue);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`hue ${this.hue}° · English: ${enName} · Russian: ${ruName}`, M, M);

    // Big swatch
    g.fillStyle = `rgb(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])})`;
    g.fillRect(M + 30, M + 50, 300, 220);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 30, M + 50, 300, 220);

    // Boundary line
    g.fillStyle = theme.crimson; g.font = '13px serif';
    g.fillText(`category: ${ruName}`, M + 360, M + 80);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(`boundary ≈ 225° (light vs dark blue split)`, M + 360, M + 100);
    g.fillText('Russian speakers cross this boundary ~10% faster (Winawer 2007)', M + 360, M + 116);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Linguistic relativity in colour: cross-category pairs are discriminated more reliably when language enforces the split.', M, h - M);
  }
}

new SapirWhorf();
