import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { snellRefract, DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class LateralDisplacement {
  private stage: CanvasStage;
  private thetaDeg = 50;
  private thickness = 160;
  private n = 1.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.thetaDeg = hydrateNumber('theta', 50);
    this.thickness = hydrateNumber('t', 160);
    this.n = hydrateNumber('n', 1.5);
    (document.getElementById('theta') as EncSlider).value = this.thetaDeg;
    (document.getElementById('t') as EncSlider).value = this.thickness;
    (document.getElementById('n') as EncSlider).value = this.n;
    registerStateParam('theta', () => this.thetaDeg);
    registerStateParam('t', () => this.thickness);
    registerStateParam('n', () => this.n);
    for (const id of ['theta', 't', 'n']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'theta') this.thetaDeg = v;
        else if (id === 't') this.thickness = v;
        else this.n = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.thetaDeg = 50; this.thickness = 160; this.n = 1.5;
      (document.getElementById('theta') as EncSlider).value = 50;
      (document.getElementById('t') as EncSlider).value = 160;
      (document.getElementById('n') as EncSlider).value = 1.5;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const cy = h * 0.5;
    const slabTop = cy - this.thickness / 2;
    const slabBot = cy + this.thickness / 2;

    // Slab
    ctx.fillStyle = theme.slateAlpha(0.10);
    ctx.fillRect(0, slabTop, w, this.thickness);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, slabTop); ctx.lineTo(w, slabTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, slabBot); ctx.lineTo(w, slabBot); ctx.stroke();

    const t1 = this.thetaDeg * DEG;
    const t2 = snellRefract(1, this.n, t1)!;
    const entryX = w * 0.3;
    const exitX = entryX + Math.tan(t2) * this.thickness;
    // Incoming ray (above slab)
    const inLen = 200;
    const ix = entryX - Math.sin(t1) * inLen;
    const iy = slabTop - Math.cos(t1) * inLen;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(entryX, slabTop); ctx.stroke();
    // Inside slab
    ctx.strokeStyle = theme.slate;
    ctx.beginPath(); ctx.moveTo(entryX, slabTop); ctx.lineTo(exitX, slabBot); ctx.stroke();
    // Outgoing (same direction as incoming)
    const ox = exitX + Math.sin(t1) * inLen;
    const oy = slabBot + Math.cos(t1) * inLen;
    ctx.strokeStyle = theme.ink;
    ctx.beginPath(); ctx.moveTo(exitX, slabBot); ctx.lineTo(ox, oy); ctx.stroke();
    // Reference line: what the ray WOULD have done without slab
    const refOx = entryX + Math.sin(t1) * (this.thickness + inLen);
    const refOy = slabTop + Math.cos(t1) * (this.thickness + inLen);
    ctx.strokeStyle = theme.crimsonAlpha(0.45);
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(entryX, slabTop); ctx.lineTo(refOx, refOy); ctx.stroke();
    ctx.setLineDash([]);

    // Displacement: perpendicular distance between exit and reference
    const d = this.thickness * Math.sin(t1 - t2) / Math.cos(t2);

    // Indicator at exit plane
    const refExitX = entryX + Math.tan(t1) * this.thickness;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(exitX, slabBot); ctx.lineTo(refExitX, slabBot);
    ctx.stroke();
    ctx.fillStyle = theme.crimson;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`d = ${d.toFixed(1)} px`, (exitX + refExitX) / 2 - 30, slabBot + 18);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`θ₁ = ${this.thetaDeg}°   θ₂ = ${(t2 * RAD).toFixed(1)}°`, 16, 28);
    ctx.fillText(`slab t = ${this.thickness} px   n = ${this.n.toFixed(2)}`, 16, 50);
    ctx.fillText(`displacement d = t · sin(θ₁−θ₂)/cos θ₂`, 16, 72);
  }
}
window.addEventListener('DOMContentLoaded', () => new LateralDisplacement());
