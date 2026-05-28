import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { CMF_1931_2DEG } from '@core/math/cmf';
import { xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ProjectiveLocus {
  private stage: CanvasStage;
  private proj = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.proj = hydrateNumber('proj', 0);
    (document.getElementById('proj') as EncSlider).value = this.proj;
    registerStateParam('proj', () => this.proj);
    (document.getElementById('proj') as EncSlider).addEventListener('input', (e) => {
      this.proj = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.proj = 0;
      (document.getElementById('proj') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const t = this.proj / 100;
    const cx = w * 0.5, cy = h * 0.62, s = Math.min(w, h) * 0.42;
    const A = 0.866;
    // 3-D iso position of scaled XYZ (Y up).
    const iso = (X: number, Y: number, Z: number): [number, number] => [cx + (X - Z) * A * s, cy - Y * s + (X + Z) * 0.5 * s];
    // Flat 2-D chromaticity position.
    const flatX0 = w * 0.2, flatY0 = h * 0.86, flatS = Math.min(w * 0.5, h * 0.62);
    const flat = (x: number, y: number): [number, number] => [flatX0 + x * flatS, flatY0 - y * flatS];

    // Spectral locus points.
    const pts = CMF_1931_2DEG.map((r) => {
      const sum = r.xBar + r.yBar + r.zBar || 1e-6;
      const p3 = iso(r.xBar, r.yBar, r.zBar);
      const p2 = flat(r.xBar / sum, r.yBar / sum);
      return { x: r.xBar / sum, y: r.yBar / sum, sx: p3[0] + (p2[0] - p3[0]) * t, sy: p3[1] + (p2[1] - p3[1]) * t };
    });

    // Axes hint (fade between 3D triad and 2D).
    ctx.strokeStyle = theme.inkAlpha(0.25 * (1 - t) + 0.0); ctx.lineWidth = 1;
    if (t < 0.9) {
      const o = iso(0, 0, 0);
      for (const ax of [iso(1.8, 0, 0), iso(0, 1.0, 0), iso(0, 0, 1.8)]) {
        ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(ax[0], ax[1]); ctx.stroke();
      }
    }

    // Locus curve, coloured.
    ctx.lineWidth = 2.5;
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.strokeStyle = xyToCss(pts[i].x, pts[i].y);
      ctx.beginPath(); ctx.moveTo(pts[i].sx, pts[i].sy); ctx.lineTo(pts[i + 1].sx, pts[i + 1].sy); ctx.stroke();
    }
    // Close with the purple line when flattened.
    ctx.strokeStyle = theme.inkAlpha(0.4 * t); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pts[0].sx, pts[0].sy); ctx.lineTo(pts[pts.length - 1].sx, pts[pts.length - 1].sy); ctx.stroke();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(t < 0.1 ? 'spectral locus in 3-D XYZ space' : t > 0.9 ? 'flattened to the xy chromaticity horseshoe' : 'projecting onto the chromaticity plane…', w * 0.08, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new ProjectiveLocus());
