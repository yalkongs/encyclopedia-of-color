import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class DogVision {
  private stage: CanvasStage;
  private view: 'human' | 'dog' = 'dog';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('view');
    if (raw === 'human' || raw === 'dog') this.view = raw;
    const t = document.getElementById('view') as EncToggle; t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value as 'human' | 'dog'; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => { this.view = 'dog'; t.value = 'dog'; this.draw(); notifyStateChange(); });
  }

  // Simulate dichromacy: project RGB onto blue-yellow axis
  private dogify(r: number, g: number, b: number): [number, number, number] {
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    // R+G both → yellow, B stays blue
    const ry = (r + g) / 2;
    return [ry * 0.7 + lum * 0.3, ry * 0.7 + lum * 0.3, b];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`view: ${this.view} — red ball on green grass + blue toy + yellow toy`, M, M);

    // Scene
    const sceneObjects: { x: number; y: number; r: number; col: [number, number, number]; label: string }[] = [
      { x: w * 0.25, y: h * 0.45, r: 60, col: [200, 30, 30], label: 'red ball' },
      { x: w * 0.50, y: h * 0.55, r: 50, col: [60, 80, 220], label: 'blue toy' },
      { x: w * 0.75, y: h * 0.5, r: 55, col: [240, 200, 40], label: 'yellow toy' },
    ];

    // Grass background
    const grass: [number, number, number] = [80, 140, 50];
    const grassDisp = this.view === 'dog' ? this.dogify(grass[0], grass[1], grass[2]) : grass;
    g.fillStyle = `rgb(${Math.round(grassDisp[0])},${Math.round(grassDisp[1])},${Math.round(grassDisp[2])})`;
    g.fillRect(M, M + 30, w - 2 * M, h - M * 2 - 60);

    for (const o of sceneObjects) {
      const c = this.view === 'dog' ? this.dogify(o.col[0], o.col[1], o.col[2]) : o.col;
      g.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
      g.beginPath(); g.arc(o.x, o.y, o.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = theme.inkAlpha(0.4); g.stroke();
      g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(o.label, o.x, o.y + o.r + 16);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Blue and yellow toys stand out in both views; red ball almost disappears in the dog view because it merges with the grass luminance.', M, h - M);
  }
}

new DogVision();
