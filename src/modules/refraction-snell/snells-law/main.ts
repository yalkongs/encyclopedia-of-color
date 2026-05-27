import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { snellRefract, criticalAngle, DEG, RAD } from '@core/math/color-science';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class SnellsLaw {
  private stage: CanvasStage;
  private theta1Deg = 30;
  private n1 = 1.0;
  private n2 = 1.52;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    // Hydrate from ?theta1=42&n2=1.52 etc.
    this.theta1Deg = hydrateNumber('theta1', 30);
    this.n1 = hydrateNumber('n1', 1.0);
    this.n2 = hydrateNumber('n2', 1.52);
    (document.getElementById('theta1') as EncSlider).value = this.theta1Deg;
    (document.getElementById('n1') as EncSlider).value = this.n1;
    (document.getElementById('n2') as EncSlider).value = this.n2;

    // Register state for URL sync
    registerStateParam('theta1', () => this.theta1Deg);
    registerStateParam('n1', () => this.n1);
    registerStateParam('n2', () => this.n2);

    this.bindSlider('theta1', (v) => (this.theta1Deg = v));
    this.bindSlider('n1', (v) => (this.n1 = v));
    this.bindSlider('n2', (v) => (this.n2 = v));

    document.addEventListener('reset-params', () => this.reset());
  }

  private bindSlider(id: string, set: (v: number) => void) {
    const el = document.getElementById(id) as EncSlider;
    el.addEventListener('input', () => {
      set(el.value);
      this.draw();
      notifyStateChange();
    });
    set(el.value);
  }

  private reset() {
    const set = (id: string, v: number) => { (document.getElementById(id) as EncSlider).value = v; };
    set('theta1', 30); set('n1', 1.0); set('n2', 1.52);
    this.theta1Deg = 30; this.n1 = 1.0; this.n2 = 1.52;
    this.draw();
    notifyStateChange();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Lower medium — gentle slate tint to indicate the denser medium
    ctx.fillStyle = theme.slateAlpha(0.06);
    ctx.fillRect(0, cy, w, h - cy);

    // Boundary
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // Normal (vertical dashed)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.setLineDash([]);

    const theta1 = this.theta1Deg * DEG;
    const theta2 = snellRefract(this.n1, this.n2, theta1);
    const tc = criticalAngle(this.n1, this.n2);

    const rayLen = Math.min(w, h) * 0.42;

    // Incident ray — deep ink
    const ix = cx - Math.sin(theta1) * rayLen;
    const iy = cy - Math.cos(theta1) * rayLen;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();
    this.arrowHead(ctx, ix, iy, cx, cy, theme.ink);

    // Reflected ray — muted ink (always present, lower weight)
    const rx = cx + Math.sin(theta1) * rayLen;
    const ry = cy - Math.cos(theta1) * rayLen;
    ctx.strokeStyle = theme.inkAlpha(0.35);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rx, ry); ctx.stroke();

    if (theta2 !== null) {
      // Refracted ray — slate (cool, distinct from ink)
      const tx = cx + Math.sin(theta2) * rayLen;
      const ty = cy + Math.cos(theta2) * rayLen;
      ctx.strokeStyle = theme.slate;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      this.arrowHead(ctx, cx, cy, tx, ty, theme.slate);

      // Angle arcs — gold for incident, slate for refracted
      this.angleArc(ctx, cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + theta1, theme.goldDeep);
      this.angleArc(ctx, cx, cy, 50, Math.PI / 2 - theta2, Math.PI / 2, theme.slate);

      (document.getElementById('theta2-out') as HTMLElement).textContent = `${(theta2 * RAD).toFixed(2)}°`;
      (document.getElementById('state-out') as HTMLElement).textContent = 'refracting';
    } else {
      // TIR — crimson warning
      ctx.strokeStyle = theme.crimson;
      ctx.lineWidth = 1.8;
      const tx = cx + Math.sin(theta1) * rayLen;
      const ty = cy - Math.cos(theta1) * rayLen;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      (document.getElementById('theta2-out') as HTMLElement).textContent = '—';
      (document.getElementById('state-out') as HTMLElement).textContent = 'TIR';
    }

    (document.getElementById('tc-out') as HTMLElement).textContent =
      tc === null ? '—' : `${(tc * RAD).toFixed(2)}°`;

    // Index labels — italic serif, gold
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`n₁ = ${this.n1.toFixed(2)}`, 12, cy - 10);
    ctx.fillText(`n₂ = ${this.n2.toFixed(2)}`, 12, cy + 22);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('normal', cx + 6, 14);
  }

  private arrowHead(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) {
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const size = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - size * Math.cos(angle - 0.35), y1 - size * Math.sin(angle - 0.35));
    ctx.lineTo(x1 - size * Math.cos(angle + 0.35), y1 - size * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fill();
  }

  private angleArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
}

window.addEventListener('DOMContentLoaded', () => new SnellsLaw());
