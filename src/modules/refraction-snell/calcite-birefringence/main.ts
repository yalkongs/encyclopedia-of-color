import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { snellRefract, DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N_O = 1.658;  // ordinary
const N_E = 1.486;  // extraordinary (along optical axis)

class Calcite {
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

    const cy = h / 2;
    const crystalTop = cy - 70, crystalBot = cy + 70;
    const crystalLeft = w * 0.35, crystalRight = w * 0.78;

    // Crystal
    ctx.fillStyle = theme.slateAlpha(0.07);
    ctx.fillRect(crystalLeft, crystalTop, crystalRight - crystalLeft, crystalBot - crystalTop);
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.strokeRect(crystalLeft + 0.5, crystalTop + 0.5, crystalRight - crystalLeft - 1, crystalBot - crystalTop - 1);
    // Optical axis (dashed)
    ctx.strokeStyle = theme.goldAlpha(0.5);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(crystalLeft, crystalBot - 15); ctx.lineTo(crystalRight, crystalTop + 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('optical axis', crystalRight - 70, crystalTop + 12);

    // Incident ray (single)
    const t1 = this.thetaDeg * DEG;
    const tO = snellRefract(1, N_O, t1)!;
    const tE = snellRefract(1, N_E, t1)!;
    const entryX = crystalLeft + (crystalRight - crystalLeft) * 0.3;
    const inLen = 200;
    const ix = entryX - Math.sin(t1) * inLen, iy = crystalTop - Math.cos(t1) * inLen;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(entryX, crystalTop); ctx.stroke();

    // o-ray and e-ray inside crystal
    const thickness = crystalBot - crystalTop;
    const oExit = entryX + Math.tan(tO) * thickness;
    const eExit = entryX + Math.tan(tE) * thickness;
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(entryX, crystalTop); ctx.lineTo(oExit, crystalBot); ctx.stroke();
    ctx.strokeStyle = theme.crimson;
    ctx.beginPath(); ctx.moveTo(entryX, crystalTop); ctx.lineTo(eExit, crystalBot); ctx.stroke();

    // Below crystal: rays exit refracted back to t1
    const outLen = 200;
    const ox = oExit + Math.sin(t1) * outLen, oy = crystalBot + Math.cos(t1) * outLen;
    const ex = eExit + Math.sin(t1) * outLen, ey = crystalBot + Math.cos(t1) * outLen;
    ctx.strokeStyle = theme.slate;
    ctx.beginPath(); ctx.moveTo(oExit, crystalBot); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.strokeStyle = theme.crimson;
    ctx.beginPath(); ctx.moveTo(eExit, crystalBot); ctx.lineTo(ex, ey); ctx.stroke();

    // Labels
    ctx.fillStyle = theme.slate;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`o-ray  n_o = ${N_O}`, ox + 6, oy);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`e-ray  n_e = ${N_E}`, ex + 6, ey + 18);

    // Readouts
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`θ₁ = ${this.thetaDeg}°`, 16, 30);
    ctx.fillText(`θ_o = ${(tO * RAD).toFixed(2)}°`, 16, 52);
    ctx.fillText(`θ_e = ${(tE * RAD).toFixed(2)}°`, 16, 74);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('separation grows with both incidence angle and crystal thickness', 16, h - 24);
  }
}
window.addEventListener('DOMContentLoaded', () => new Calcite());
