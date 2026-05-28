import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const ALPHA_589 = 66.5; // specific rotation of sucrose, °·mL/(g·dm) at 589 nm

class OpticalActivity {
  private stage: CanvasStage;
  private c = 30;       // g/100mL
  private L = 20;       // cm
  private lambda = 589; // nm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 30);
    this.L = hydrateNumber('L', 20);
    this.lambda = hydrateNumber('lambda', 589);
    (document.getElementById('c') as EncSlider).value = this.c;
    (document.getElementById('L') as EncSlider).value = this.L;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('c', () => this.c);
    registerStateParam('L', () => this.L);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['c', 'L', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'c') this.c = v;
        else if (id === 'L') this.L = v;
        else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.c = 30; this.L = 20; this.lambda = 589;
      (document.getElementById('c') as EncSlider).value = 30;
      (document.getElementById('L') as EncSlider).value = 20;
      (document.getElementById('lambda') as EncSlider).value = 589;
      this.draw(); notifyStateChange();
    });
  }

  // Rotation angle β in degrees.
  private beta(): number {
    const cgml = this.c / 100;          // g/mL
    const Ldm = this.L / 10;            // dm
    const alphaLam = ALPHA_589 * (589 / this.lambda) ** 2;
    return alphaLam * cgml * Ldm;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const beta = this.beta();
    const cy = h * 0.5;
    const tubeX0 = w * 0.22, tubeX1 = w * 0.78;
    const tubeR = Math.min(h * 0.16, 60);

    // Tube (sugar solution).
    ctx.fillStyle = 'rgba(180,150,90,0.12)';
    ctx.fillRect(tubeX0, cy - tubeR, tubeX1 - tubeX0, 2 * tubeR);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.strokeRect(tubeX0, cy - tubeR, tubeX1 - tubeX0, 2 * tubeR);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('sugar solution', (tubeX0 + tubeX1) / 2 - 36, cy + tubeR + 16);

    // Polarization plane rotates continuously along the tube.
    const segs = 26;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const x = tubeX0 + (tubeX1 - tubeX0) * f;
      const ang = (beta * f) * DEG;        // accumulated rotation
      const len = tubeR * 0.8;
      const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;  // start vertical
      ctx.strokeStyle = theme.crimsonAlpha(0.35 + 0.4 * f);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - dx, cy - dy); ctx.lineTo(x + dx, cy + dy); ctx.stroke();
    }

    // Input arrow (vertical) left of tube.
    const drawArrow = (x: number, angDeg: number, col: string, label: string) => {
      const ang = angDeg * DEG;
      const len = tubeR * 0.9;
      const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
      ctx.strokeStyle = col; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x - dx, cy + dy); ctx.lineTo(x + dx, cy - dy); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText(label, x - 16, cy + tubeR + 34);
    };
    drawArrow(tubeX0 - 36, 0, theme.slate, 'input 0°');
    drawArrow(tubeX1 + 36, beta, theme.crimson, `out ${beta.toFixed(0)}°`);

    // Readouts.
    const alphaLam = ALPHA_589 * (589 / this.lambda) ** 2;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`rotation β = ${beta.toFixed(1)}°`, 16, 30);
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`[α]_λ = ${alphaLam.toFixed(1)} °·mL/(g·dm)   c = ${this.c} g/100mL   L = ${this.L} cm`, 16, 52);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`λ = ${this.lambda} nm — shorter wavelengths rotate more (rotatory dispersion)`, 16, 74);
  }
}
window.addEventListener('DOMContentLoaded', () => new OpticalActivity());
