import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Retroreflection {
  private stage: CanvasStage;
  private thetaDeg = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 30);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    registerStateParam('theta', () => this.thetaDeg);
    (document.getElementById('theta') as EncSlider).addEventListener('input', (e) => {
      this.thetaDeg = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 30; (document.getElementById('theta') as EncSlider).value = 30;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const corner = { x: w * 0.7, y: h * 0.5 };
    const wallLen = 200;

    // Walls (horizontal and vertical at right-angle corner — top wall + right wall)
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(corner.x - wallLen, corner.y); ctx.lineTo(corner.x, corner.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(corner.x, corner.y); ctx.lineTo(corner.x, corner.y - wallLen); ctx.stroke();
    // Hatching (reflective)
    ctx.lineWidth = 1;
    for (let i = 0; i < wallLen; i += 8) {
      ctx.beginPath();
      ctx.moveTo(corner.x - i, corner.y); ctx.lineTo(corner.x - i + 4, corner.y - 6);
      ctx.moveTo(corner.x, corner.y - i); ctx.lineTo(corner.x + 6, corner.y - i + 4);
      ctx.stroke();
    }

    const t = this.thetaDeg * DEG;
    // Incoming ray: from upper-left, angle t below horizontal (going right-downward toward corner space)
    const inDir = { x: Math.cos(t), y: Math.sin(t) };
    // Pick a starting point so the ray hits the top wall (corner.y) at some x to the left of corner
    const startX = 80;
    const startY = corner.y - 120;
    // Where does ray hit top wall? y = corner.y. Solve startY + tParam*inDir.y = corner.y.
    const tParam1 = (corner.y - startY) / inDir.y;
    const hit1 = { x: startX + tParam1 * inDir.x, y: corner.y };

    // After reflection off top wall: vertical component flips → dir2 = (inDir.x, -inDir.y)
    const dir2 = { x: inDir.x, y: -inDir.y };
    // Now find hit on right wall (x = corner.x)
    const tParam2 = (corner.x - hit1.x) / dir2.x;
    const hit2 = { x: corner.x, y: hit1.y + tParam2 * dir2.y };

    // After reflection off right wall: horizontal component flips → dir3 = (-dir2.x, dir2.y) = (-inDir.x, -inDir.y) (= reverse of inDir)
    const dir3 = { x: -inDir.x, y: -inDir.y };
    const outLen = 200;
    const out = { x: hit2.x + dir3.x * outLen, y: hit2.y + dir3.y * outLen };

    // Draw rays
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(hit1.x, hit1.y); ctx.stroke();
    ctx.strokeStyle = theme.slate;
    ctx.beginPath(); ctx.moveTo(hit1.x, hit1.y); ctx.lineTo(hit2.x, hit2.y); ctx.stroke();
    ctx.strokeStyle = theme.crimson;
    ctx.beginPath(); ctx.moveTo(hit2.x, hit2.y); ctx.lineTo(out.x, out.y); ctx.stroke();

    // Verify parallel: draw a dashed reference parallel to incoming through out endpoint
    ctx.strokeStyle = theme.goldAlpha(0.5); ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(out.x, out.y);
    ctx.lineTo(out.x + 100, out.y - 100 * Math.tan(t));   // continues parallel reverse
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('in', startX - 10, startY - 6);
    ctx.fillText('out', out.x + 6, out.y + 14);

    // Readout
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ_in = ${this.thetaDeg}°`, 16, 28);
    ctx.fillText(`θ_out = ${this.thetaDeg}°  (parallel, opposite direction)`, 16, 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Two reflections off perpendicular walls invert both velocity components → ray returns parallel.', 16, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new Retroreflection());
