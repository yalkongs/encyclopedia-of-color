import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Sunglasses {
  private stage: CanvasStage;
  private axis = 90; // degrees from horizontal

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.axis = hydrateNumber('axis', 90);
    (document.getElementById('axis') as EncSlider).value = this.axis;
    registerStateParam('axis', () => this.axis);
    (document.getElementById('axis') as EncSlider).addEventListener('input', (e) => {
      this.axis = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.axis = 90;
      (document.getElementById('axis') as EncSlider).value = 90;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Glare is horizontally polarized (angle 0). Transmitted fraction by Malus.
    const theta = this.axis * DEG;
    const T = Math.cos(theta) ** 2;

    // Scene: a "road/water" scene whose glare brightness scales with T.
    const sceneX = w * 0.30, sceneY = h * 0.22, sceneW = w * 0.42, sceneH = h * 0.5;
    // Sky.
    ctx.fillStyle = '#9bb4cf';
    ctx.fillRect(sceneX, sceneY, sceneW, sceneH * 0.45);
    // Water/road with glare.
    const horizon = sceneY + sceneH * 0.45;
    const glare = ctx.createLinearGradient(0, horizon, 0, sceneY + sceneH);
    const g = Math.round(120 + 135 * T);
    glare.addColorStop(0, `rgb(${g},${g},${Math.round(g * 0.95)})`);
    glare.addColorStop(1, '#3a4a5a');
    ctx.fillStyle = glare;
    ctx.fillRect(sceneX, horizon, sceneW, sceneH * 0.55);
    // Specular glare streaks.
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * T})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const yy = horizon + (sceneH * 0.55) * ((i + 0.5) / 6);
      ctx.beginPath(); ctx.moveTo(sceneX + 10, yy); ctx.lineTo(sceneX + sceneW - 10, yy); ctx.stroke();
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.strokeRect(sceneX, sceneY, sceneW, sceneH);

    // Lens overlay (tinted oval) with its transmission axis drawn.
    const lcx = sceneX + sceneW * 0.5, lcy = sceneY + sceneH * 0.5;
    const lr = Math.min(sceneW, sceneH) * 0.34;
    ctx.fillStyle = 'rgba(40,40,60,0.25)';
    ctx.beginPath(); ctx.ellipse(lcx, lcy, lr * 1.3, lr, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(lcx, lcy, lr * 1.3, lr, 0, 0, 2 * Math.PI); ctx.stroke();
    // Transmission axis line.
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 2.2;
    const ax = Math.cos(theta), ay = -Math.sin(theta);
    ctx.beginPath(); ctx.moveTo(lcx - ax * lr * 1.2, lcy - ay * lr * 1.2); ctx.lineTo(lcx + ax * lr * 1.2, lcy + ay * lr * 1.2); ctx.stroke();

    // Glare polarization indicator (horizontal arrows, left side).
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    const gx = w * 0.12, gy = h * 0.5;
    ctx.beginPath(); ctx.moveTo(gx - 28, gy); ctx.lineTo(gx + 28, gy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 28, gy); ctx.lineTo(gx + 20, gy - 5); ctx.moveTo(gx + 28, gy); ctx.lineTo(gx + 20, gy + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx - 28, gy); ctx.lineTo(gx - 20, gy - 5); ctx.moveTo(gx - 28, gy); ctx.lineTo(gx - 20, gy + 5); ctx.stroke();
    ctx.fillStyle = theme.crimson; ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('glare (horizontal)', gx - 48, gy + 24);

    // Readouts.
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`lens axis = ${this.axis}° from horizontal`, 16, 30);
    ctx.fillText(`glare transmitted = ${(T * 100).toFixed(0)}%`, 16, 52);
    ctx.fillStyle = T < 0.05 ? theme.slate : theme.crimson;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(T < 0.05 ? 'glare extinguished — like real sunglasses' : (T > 0.9 ? 'glare fully passes' : 'glare partially blocked'), 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new Sunglasses());
