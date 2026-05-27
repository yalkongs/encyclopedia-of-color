import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Geometric shadow on a wall behind a small disc-shaped occluder.
 * Distances are pixel-units measured along the optical axis.
 *
 *   lamp ─── d_lamp ──→ object ─── d_wall ──→ wall
 *
 * Shadow radius on the wall = object_radius × (d_lamp + d_wall) / d_lamp.
 */
class ShadowSize {
  private stage: CanvasStage;
  private dLamp = 120;     // lamp-to-object
  private rObj = 26;        // object radius

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.dLamp = hydrateNumber('d', 120);
    this.rObj = hydrateNumber('r', 26);
    (document.getElementById('d') as EncSlider).value = this.dLamp;
    (document.getElementById('r') as EncSlider).value = this.rObj;

    registerStateParam('d', () => this.dLamp);
    registerStateParam('r', () => this.rObj);

    (document.getElementById('d') as EncSlider).addEventListener('input', (e) => {
      this.dLamp = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    (document.getElementById('r') as EncSlider).addEventListener('input', (e) => {
      this.rObj = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    (document.getElementById('d') as EncSlider).value = 120;
    (document.getElementById('r') as EncSlider).value = 26;
    this.dLamp = 120; this.rObj = 26;
    this.draw(); notifyStateChange();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const lampX = 60;
    const wallX = w - 60;
    const cy = h / 2;
    const objX = Math.min(lampX + this.dLamp, wallX - 60);
    const dWall = wallX - objX;

    // Wall
    ctx.fillStyle = theme.paperRecess;
    ctx.fillRect(wallX, 30, 8, h - 60);
    ctx.fillStyle = theme.inkAlpha(0.6);
    ctx.fillRect(wallX, 30, 1, h - 60);

    // Shadow on wall (umbra only — point source)
    const shadowR = this.rObj * (this.dLamp + dWall) / this.dLamp;
    ctx.fillStyle = theme.inkAlpha(0.85);
    ctx.fillRect(wallX, cy - shadowR, 4, shadowR * 2);

    // Light rays (tangent to object)
    ctx.strokeStyle = theme.goldAlpha(0.45);
    ctx.lineWidth = 1;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(lampX, cy);
      ctx.lineTo(objX, cy + sign * this.rObj);
      ctx.lineTo(wallX, cy + sign * shadowR);
      ctx.stroke();
    }
    // Inner rays for fill (subtle)
    ctx.strokeStyle = theme.goldAlpha(0.12);
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const yObj = cy + (this.rObj * i) / 4;
      const yWall = cy + (shadowR * i) / 4;
      ctx.beginPath();
      ctx.moveTo(lampX, cy);
      ctx.lineTo(objX, yObj);
      ctx.lineTo(wallX, yWall);
      ctx.stroke();
    }

    // Lamp
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(lampX, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('lamp', lampX - 14, cy - 18);

    // Object (small disc)
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(objX, cy, this.rObj, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('object', objX - 22, cy - this.rObj - 8);
    ctx.fillText('wall', wallX + 14, cy - shadowR - 6);

    // Calipers / readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`d_lamp = ${this.dLamp.toFixed(0)} px`, 18, 28);
    ctx.fillText(`r_obj = ${this.rObj.toFixed(0)} px`, 18, 50);
    ctx.fillText(`shadow = ${shadowR.toFixed(0)} px`, 18, 72);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`× ${((this.dLamp + dWall) / this.dLamp).toFixed(2)}`, 18, 94);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('magnification = (d_lamp + d_wall) / d_lamp', 18, 110);
  }
}

window.addEventListener('DOMContentLoaded', () => new ShadowSize());
