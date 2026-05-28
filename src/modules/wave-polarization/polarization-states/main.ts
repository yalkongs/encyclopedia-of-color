import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG, RAD } from '@core/math/physics';
import { jonesFromAmpPhase, stokes, ellipseParams, degreeOfPolarization } from '@core/math/polarization';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class PolarizationStates {
  private stage: CanvasStage;
  private ax = 1.0;
  private ay = 1.0;
  private delta = 90;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ax = hydrateNumber('ax', 1.0);
    this.ay = hydrateNumber('ay', 1.0);
    this.delta = hydrateNumber('delta', 90);
    (document.getElementById('ax') as EncSlider).value = this.ax;
    (document.getElementById('ay') as EncSlider).value = this.ay;
    (document.getElementById('delta') as EncSlider).value = this.delta;
    registerStateParam('ax', () => this.ax);
    registerStateParam('ay', () => this.ay);
    registerStateParam('delta', () => this.delta);
    for (const id of ['ax', 'ay', 'delta']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'ax') this.ax = v;
        else if (id === 'ay') this.ay = v;
        else this.delta = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.ax = 1.0; this.ay = 1.0; this.delta = 90;
      (document.getElementById('ax') as EncSlider).value = 1.0;
      (document.getElementById('ay') as EncSlider).value = 1.0;
      (document.getElementById('delta') as EncSlider).value = 90;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.40, cy = h * 0.5;
    const scale = Math.min(w * 0.28, h * 0.38);
    const deltaRad = this.delta * DEG;

    // Axes.
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - scale * 1.25, cy); ctx.lineTo(cx + scale * 1.25, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - scale * 1.25); ctx.lineTo(cx, cy + scale * 1.25); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Eₓ', cx + scale * 1.25 + 4, cy + 4);
    ctx.fillText('E_y', cx + 6, cy - scale * 1.25 - 4);

    // Trace ellipse Ex=ax cos t, Ey=ay cos(t+δ).
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    const N = 240;
    for (let i = 0; i <= N; i++) {
      const t = (2 * Math.PI * i) / N;
      const ex = this.ax * Math.cos(t);
      const ey = this.ay * Math.cos(t + deltaRad);
      const px = cx + ex * scale, py = cy - ey * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Handedness arrow: sample two close points near t=0.
    const t0 = 0.0, t1 = 0.25;
    const p0 = { x: cx + this.ax * Math.cos(t0) * scale, y: cy - this.ay * Math.cos(t0 + deltaRad) * scale };
    const p1 = { x: cx + this.ax * Math.cos(t1) * scale, y: cy - this.ay * Math.cos(t1 + deltaRad) * scale };
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const m = Math.hypot(dx, dy) || 1;
    ctx.fillStyle = theme.crimson;
    ctx.save(); ctx.translate(p0.x, p0.y); ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -4); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    void m;

    // Stokes + ellipse params.
    const s = stokes(jonesFromAmpPhase(this.ax, this.ay, deltaRad));
    const ell = ellipseParams(s);
    const dop = degreeOfPolarization(s);

    // Classify.
    let kind: string;
    const nd = ((this.delta % 360) + 360) % 360;
    if (this.ax < 1e-3 || this.ay < 1e-3 || Math.abs(Math.sin(deltaRad)) < 0.02) kind = 'linear';
    else if (Math.abs(this.ax - this.ay) < 0.02 && Math.abs(Math.abs(nd) - 90) < 2) kind = 'circular';
    else kind = 'elliptical';
    let hand = '';
    if (kind !== 'linear') hand = s.S3 > 0 ? ' (left-handed)' : ' (right-handed)';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${kind}${hand}`, 16, 30);
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`orientation ψ = ${(ell.psi * RAD).toFixed(1)}°    ellipticity χ = ${(ell.chi * RAD).toFixed(1)}°`, 16, 52);
    ctx.fillText(`Stokes  S = (${s.S0.toFixed(2)}, ${s.S1.toFixed(2)}, ${s.S2.toFixed(2)}, ${s.S3.toFixed(2)})`, 16, 72);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`degree of polarization = ${(dop * 100).toFixed(0)}%`, 16, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PolarizationStates());
