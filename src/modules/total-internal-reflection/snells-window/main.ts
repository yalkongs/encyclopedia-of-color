import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { criticalAngle, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SnellsWindow {
  private stage: CanvasStage;
  private n = 1.33;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 1.33);
    (document.getElementById('n') as EncSlider).value = this.n;
    registerStateParam('n', () => this.n);
    (document.getElementById('n') as EncSlider).addEventListener('input', (e) => {
      this.n = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.n = 1.33; (document.getElementById('n') as EncSlider).value = 1.33;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const surfaceY = h * 0.4;
    // Above (sky tint)
    ctx.fillStyle = '#cfd9e8';   // pale sky
    ctx.fillRect(0, 0, w, surfaceY);
    // Below (water)
    ctx.fillStyle = theme.slateAlpha(0.18);
    ctx.fillRect(0, surfaceY, w, h - surfaceY);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, surfaceY); ctx.lineTo(w, surfaceY); ctx.stroke();

    const eye = { x: w * 0.5, y: surfaceY + 140 };
    const tC = criticalAngle(this.n, 1.0)!;
    const tCDeg = tC * RAD;
    const windowHalfWidth = 200;   // visual scale for the cone "footprint"

    // Snell's window cone — from eye to surface within ±θ_c
    ctx.fillStyle = 'rgba(207, 217, 232, 0.7)';   // sky tint reaches eye through this cone
    ctx.beginPath();
    ctx.moveTo(eye.x, eye.y);
    const dx = windowHalfWidth * Math.tan(tC) / Math.tan(Math.atan(windowHalfWidth / (eye.y - surfaceY)));
    void dx;
    // Simpler: project cone with half-angle θ_c at distance eye to surface
    const halfBase = Math.tan(tC) * (eye.y - surfaceY);
    ctx.lineTo(eye.x - halfBase, surfaceY);
    ctx.lineTo(eye.x + halfBase, surfaceY);
    ctx.closePath();
    ctx.fill();

    // Outside the cone: total internal reflection mirrors the bottom
    // Visualize as faint pebble pattern reflected
    ctx.fillStyle = theme.inkAlpha(0.18);
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(eye.x + s * halfBase, surfaceY);
      ctx.lineTo(eye.x + s * (w / 2 + 200), surfaceY);
      ctx.lineTo(eye.x, eye.y);
      ctx.closePath();
      ctx.fill();
    }

    // Eye marker
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(eye.x, eye.y, 8, 0, Math.PI * 2); ctx.fill();

    // Critical-angle rays
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(eye.x, eye.y); ctx.lineTo(eye.x - halfBase, surfaceY);
    ctx.moveTo(eye.x, eye.y); ctx.lineTo(eye.x + halfBase, surfaceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = axisStyle.label;
    ctx.fillText('sky compressed inside Snell\'s window', eye.x - halfBase + 8, surfaceY - 10);
    ctx.fillText('TIR mirror of the lake bottom', eye.x + halfBase + 8, surfaceY + 20);
    ctx.fillText('observer eye', eye.x + 14, eye.y + 4);

    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`water n = ${this.n.toFixed(2)}`, 16, 30);
    ctx.fillText(`θ_c = ${tCDeg.toFixed(2)}°`, 16, 52);
    ctx.fillText(`cone diameter = ${(2 * tCDeg).toFixed(1)}° of sky`, 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new SnellsWindow());
