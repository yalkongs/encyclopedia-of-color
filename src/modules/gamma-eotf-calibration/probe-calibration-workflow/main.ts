import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const GAMMA_TARGET = 2.2;
const GAMMA_NATIVE = 2.45;
const GAIN_NATIVE: [number, number, number] = [0.95, 1.0, 1.12]; // blue-tinted panel
const R = 0.18;

class Calibration {
  private stage: CanvasStage;
  private passes = 0;
  private view = 'curve';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.passes = hydrateNumber('passes', 0);
    this.view = hydrateFromUrl('view') ?? 'curve';
    const s = document.getElementById('passes') as EncSlider;
    s.value = this.passes;
    s.addEventListener('input', (e) => { this.passes = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('passes', () => Math.round(this.passes));
    const t = document.getElementById('view') as EncToggle;
    t.value = this.view;
    t.addEventListener('change', (e) => { this.view = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('view', () => this.view);
    document.addEventListener('reset-params', () => {
      this.passes = 0; this.view = 'curve'; s.value = 0; t.value = 'curve'; this.draw(); notifyStateChange();
    });
  }

  private gamma(): number { return GAMMA_TARGET + (GAMMA_NATIVE - GAMMA_TARGET) * Math.pow(R, this.passes); }
  private gain(): [number, number, number] {
    const k = Math.pow(R, this.passes);
    return [1 + (GAIN_NATIVE[0] - 1) * k, 1 + (GAIN_NATIVE[1] - 1) * k, 1 + (GAIN_NATIVE[2] - 1) * k];
  }

  private drawCurve(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gx = 60, gy = 36, gw = w - 108, gh = h - 130;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = gx + (i / 10) * gw, y = gy + (i / 10) * gh;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
    }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    const curve = (g: number, stroke: string, lw: number, dash: number[] = []) => {
      ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const V = i / 200, L = Math.pow(V, g); const x = gx + V * gw, y = gy + gh - L * gh; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    };
    curve(GAMMA_TARGET, theme.gold, 2.4, [5, 4]);          // target
    curve(this.gamma(), theme.crimson, 2.4);                // measured

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('code value V', gx + gw / 2, gy + gh + 28);
    ctx.save(); ctx.translate(gx - 40, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('luminance L', 0, 0); ctx.restore();

    const lx = gx + 14; let ly = gy + 16;
    const key = (col: string, txt: string) => { ctx.fillStyle = col; ctx.fillRect(lx, ly - 8, 16, 3); ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.font = '12px Inter, sans-serif'; ctx.fillText(txt, lx + 22, ly - 2); ly += 18; };
    key(theme.gold, 'target  γ 2.2');
    key(theme.crimson, `measured  γ ${this.gamma().toFixed(2)}`);
  }

  private drawRamp(ctx: CanvasRenderingContext2D, w: number) {
    const g = this.gamma(), gain = this.gain();
    const gx = 50, gw = w - 100, top = 56, ramph = 70;
    const enc = (L: number) => Math.round(Math.max(0, Math.min(1, Math.pow(Math.max(0, L), 1 / 2.2))) * 255);
    const steps = 256;
    for (let i = 0; i < steps; i++) {
      const V = i / (steps - 1);
      const Lr = Math.pow(V, g) * gain[0], Lg = Math.pow(V, g) * gain[1], Lb = Math.pow(V, g) * gain[2];
      ctx.fillStyle = `rgb(${enc(Lr)},${enc(Lg)},${enc(Lb)})`;
      ctx.fillRect(gx + (i / steps) * gw, top, gw / steps + 1, ramph);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(gx, top, gw, ramph);
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('what the panel shows for a neutral 0→100% ramp', gx, top - 12);

    // ideal reference ramp
    const top2 = top + ramph + 34;
    for (let i = 0; i < steps; i++) { const v = Math.round((i / (steps - 1)) * 255); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(gx + (i / steps) * gw, top2, gw / steps + 1, ramph); }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(gx, top2, gw, ramph);
    ctx.fillStyle = theme.ink; ctx.fillText('target — neutral, evenly stepped', gx, top2 - 12);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    if (this.view === 'curve') this.drawCurve(ctx, w, h); else this.drawRamp(ctx, w);

    const gErr = ((this.gamma() - GAMMA_TARGET) / GAMMA_TARGET) * 100;
    const tint = Math.max(...this.gain().map((x) => Math.abs(x - 1))) * 100;
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`after ${Math.round(this.passes)} pass${this.passes === 1 ? '' : 'es'}: γ error ${gErr.toFixed(1)}%, white-point tint ${tint.toFixed(1)}%`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new Calibration());
