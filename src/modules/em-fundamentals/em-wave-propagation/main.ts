import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { drawArrow3D, drawAxisTriad, cross3, type Vec3D } from '@core/render/em-vector';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class EmWavePropagation {
  private stage: CanvasStage;
  /** Rotation of E in the yz-plane, in degrees from +y */
  private rotDeg = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.rotDeg = hydrateNumber('rot', 0);
    (document.getElementById('rot') as EncSlider).value = this.rotDeg;
    registerStateParam('rot', () => this.rotDeg);

    (document.getElementById('rot') as EncSlider).addEventListener('input', (e) => {
      this.rotDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.rotDeg = 0;
      (document.getElementById('rot') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const origin = { x: w * 0.5, y: h * 0.55 };
    const scale = Math.min(w, h) * 0.0035;
    const armLen = 90;

    // Axis triad (faint)
    drawAxisTriad(ctx, origin, armLen * 0.55 / scale, { alpha: 0.3 });

    const phi = this.rotDeg * DEG;

    // E sits in the yz-plane, rotated by phi from +y axis
    const E: Vec3D = { x: 0, y: armLen * Math.cos(phi), z: armLen * Math.sin(phi) };
    // B is perpendicular to E in the yz-plane (rotated by +90°)
    const B: Vec3D = { x: 0, y: -armLen * Math.sin(phi), z: armLen * Math.cos(phi) };
    // k = E × B / |E||B|  (in our 3D coord — this should point along +x)
    const kRaw = cross3(E, B);
    const kMag = Math.hypot(kRaw.x, kRaw.y, kRaw.z);
    const k: Vec3D = {
      x: (kRaw.x / kMag) * armLen * 1.2,
      y: (kRaw.y / kMag) * armLen * 1.2,
      z: (kRaw.z / kMag) * armLen * 1.2,
    };

    // Draw vectors
    drawArrow3D(ctx, origin, E, scale, theme.crimson, 3, 'E');
    drawArrow3D(ctx, origin, B, scale, theme.goldDeep, 3, 'B');
    drawArrow3D(ctx, origin, k, scale, theme.ink, 3.5, 'k = E × B');

    // Annotation
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`E rotation φ = ${this.rotDeg}°`, 16, 28);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('E and B both rotate together in the yz-plane; k always emerges perpendicular to both.', 16, 50);
    ctx.fillText('Right-hand rule: curl fingers from E (crimson) toward B (gold) — thumb points along k.', 16, h - 28);
  }
}

window.addEventListener('DOMContentLoaded', () => new EmWavePropagation());
