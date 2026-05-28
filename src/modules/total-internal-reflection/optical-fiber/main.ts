import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class OpticalFiber {
  private stage: CanvasStage;
  private nCore = 1.48;
  private nClad = 1.46;
  private incidentDeg = 8;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.nCore = hydrateNumber('nc', 1.48);
    this.nClad = hydrateNumber('nl', 1.46);
    this.incidentDeg = hydrateNumber('a', 8);
    (document.getElementById('nc') as EncSlider).value = this.nCore;
    (document.getElementById('nl') as EncSlider).value = this.nClad;
    (document.getElementById('a') as EncSlider).value = this.incidentDeg;
    registerStateParam('nc', () => this.nCore);
    registerStateParam('nl', () => this.nClad);
    registerStateParam('a', () => this.incidentDeg);
    for (const id of ['nc', 'nl', 'a']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'nc') this.nCore = v;
        else if (id === 'nl') this.nClad = v;
        else this.incidentDeg = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.nCore = 1.48; this.nClad = 1.46; this.incidentDeg = 8;
      (document.getElementById('nc') as EncSlider).value = 1.48;
      (document.getElementById('nl') as EncSlider).value = 1.46;
      (document.getElementById('a') as EncSlider).value = 8;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h * 0.5;
    const coreH = 60;
    const cladH = 30;
    const startX = 40, endX = w - 40;

    // Cladding (outer)
    ctx.fillStyle = theme.slateAlpha(0.10);
    ctx.fillRect(startX, cy - coreH / 2 - cladH, endX - startX, coreH + 2 * cladH);
    // Core
    ctx.fillStyle = theme.slateAlpha(0.18);
    ctx.fillRect(startX, cy - coreH / 2, endX - startX, coreH);
    ctx.strokeStyle = theme.inkAlpha(0.4);
    ctx.strokeRect(startX, cy - coreH / 2, endX - startX, coreH);
    ctx.strokeStyle = theme.inkAlpha(0.25);
    ctx.strokeRect(startX, cy - coreH / 2 - cladH, endX - startX, coreH + 2 * cladH);

    // NA = sqrt(n_core² − n_clad²)
    const NA = Math.sqrt(Math.max(0, this.nCore * this.nCore - this.nClad * this.nClad));
    const acceptanceDeg = NA <= 1 ? Math.asin(NA) * RAD : 90;
    const accepted = this.incidentDeg <= acceptanceDeg;

    // Incident ray (left of fiber)
    const inAngle = this.incidentDeg * DEG;
    const inLen = 120;
    const ix = startX - Math.cos(inAngle) * inLen;
    const iy = cy - Math.sin(inAngle) * inLen;
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(startX, cy); ctx.stroke();

    if (accepted) {
      // Inside fiber: refracted angle θ_t inside core: sin θ_t = sin θ_ext / n_core
      const t_internal = Math.asin(Math.sin(inAngle) / this.nCore);
      // Then ray hits cladding boundary at angle (π/2 − t_internal) from normal.
      // For TIR we need cos t_internal ≥ n_clad/n_core, i.e. n_core·sin(90°−t_internal) ≥ n_clad
      // (it always holds inside the acceptance cone by construction).

      // Zig-zag the ray
      const dxPerSegment = (coreH / 2) / Math.tan(Math.PI / 2 - t_internal);
      let x = startX, y = cy, dir = -1;  // start going up (toward upper wall)
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      while (x < endX) {
        const xNext = Math.min(x + dxPerSegment, endX);
        const yNext = y + dir * (xNext - x) * Math.tan(Math.PI / 2 - t_internal);
        ctx.lineTo(xNext, yNext);
        x = xNext;
        if (xNext < endX) dir = -dir;
        y = yNext;
      }
      ctx.stroke();
    } else {
      // Rejected — ray exits through cladding
      ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.5;
      const exitX = startX + 80;
      const exitY = cy - Math.tan(inAngle) * 80;
      ctx.beginPath();
      ctx.moveTo(startX, cy);
      ctx.lineTo(exitX, exitY);
      ctx.stroke();
      ctx.fillStyle = theme.crimson;
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillText('REJECTED — outside acceptance cone', startX + 4, exitY - 8);
    }

    // Acceptance cone visualisation at entry
    ctx.strokeStyle = theme.goldAlpha(0.45); ctx.setLineDash([3, 4]);
    const coneLen = 70;
    const accRad = acceptanceDeg * DEG;
    ctx.beginPath();
    ctx.moveTo(startX, cy);
    ctx.lineTo(startX - Math.cos(accRad) * coneLen, cy - Math.sin(accRad) * coneLen);
    ctx.moveTo(startX, cy);
    ctx.lineTo(startX - Math.cos(accRad) * coneLen, cy + Math.sin(accRad) * coneLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('core', endX - 30, cy - 4);
    ctx.fillText('cladding', endX - 50, cy - coreH / 2 - cladH / 2);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`n_core = ${this.nCore.toFixed(2)}    n_clad = ${this.nClad.toFixed(2)}`, 16, 30);
    ctx.fillText(`NA = √(n_core² − n_clad²) = ${NA.toFixed(3)}`, 16, 52);
    ctx.fillText(`acceptance cone θ_a = ${acceptanceDeg.toFixed(2)}°`, 16, 74);
    ctx.fillStyle = accepted ? theme.crimson : theme.crimson;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(accepted
                  ? `θ_in = ${this.incidentDeg}° — ACCEPTED, TIR guidance`
                  : `θ_in = ${this.incidentDeg}° — REJECTED`,
                 16, 96);
  }
}
window.addEventListener('DOMContentLoaded', () => new OpticalFiber());
