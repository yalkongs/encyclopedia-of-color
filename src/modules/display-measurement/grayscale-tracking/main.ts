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

const STEPS = 21;

class Grayscale {
  private stage: CanvasStage;
  private err = 40;
  private pattern = 'coolshadow';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.err = hydrateNumber('err', 40);
    this.pattern = hydrateFromUrl('pattern') ?? 'coolshadow';
    const s = document.getElementById('err') as EncSlider;
    s.value = this.err;
    s.addEventListener('input', (e) => { this.err = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('err', () => Math.round(this.err));
    const t = document.getElementById('pattern') as EncToggle;
    t.value = this.pattern;
    t.addEventListener('change', (e) => { this.pattern = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pattern', () => this.pattern);
    document.addEventListener('reset-params', () => { this.err = 40; this.pattern = 'coolshadow'; s.value = 40; t.value = 'coolshadow'; this.draw(); notifyStateChange(); });
  }

  // per-step tint: returns [rMul, gMul, bMul] around 1, and a ΔE estimate
  private tint(step01: number): { mul: [number, number, number]; dE: number } {
    const e = this.err / 100;
    let warm = 0; // + = warm (more red, less blue)
    if (this.pattern === 'coolshadow') warm = -(1 - step01);     // shadows cool (blue)
    else if (this.pattern === 'warmhigh') warm = step01;          // highlights warm
    else warm = 0.6;                                              // uniform warm tint
    const amp = e * 0.22 * warm;
    const mul: [number, number, number] = [1 + amp, 1, 1 - amp];
    // ΔE proxy: chroma error scales with amp and with luminance presence
    const dE = Math.abs(amp) * 60 * (0.4 + 0.6 * step01);
    return { mul, dE };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 50, gw = w - 90;

    // ramp strip
    const ry = 44, rh = 80, cw = gw / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const v = i / (STEPS - 1), base = v * 255;
      const { mul } = this.tint(v);
      const r = Math.min(255, base * mul[0]), g = Math.min(255, base * mul[1]), b = Math.min(255, base * mul[2]);
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(gx + i * cw, ry, cw + 0.5, rh);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(gx, ry, gw, rh);
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('measured grey ramp (0 → 100%)', gx, ry - 10);

    // ΔE chart
    const cy = ry + rh + 56, ch = h - cy - 60;
    const dEmax = 10;
    const Y = (d: number) => cy + ch - Math.min(1, d / dEmax) * ch;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let d = 0; d <= dEmax; d += 2) { const y = Y(d); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); ctx.fillStyle = theme.inkSoft; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`${d}`, gx - 6, y + 3); }
    // threshold band ΔE < 3
    ctx.fillStyle = 'rgba(46,125,79,0.12)'; ctx.fillRect(gx, Y(3), gw, cy + ch - Y(3));
    ctx.strokeStyle = '#2e7d4f'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, Y(3)); ctx.lineTo(gx + gw, Y(3)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, cy, gw, ch);

    // ΔE bars + line
    let maxDE = 0;
    ctx.fillStyle = theme.crimson;
    for (let i = 0; i < STEPS; i++) {
      const v = i / (STEPS - 1), { dE } = this.tint(v); maxDE = Math.max(maxDE, dE);
      const x = gx + i * cw + cw * 0.5;
      ctx.beginPath(); ctx.arc(x, Y(dE), 3, 0, Math.PI * 2); ctx.fill();
      if (i > 0) { const pv = (i - 1) / (STEPS - 1); ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx + (i - 1) * cw + cw * 0.5, Y(this.tint(pv).dE)); ctx.lineTo(x, Y(dE)); ctx.stroke(); }
    }
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('step (black → white)', gx + gw / 2, cy + ch + 26);
    ctx.save(); ctx.translate(gx - 34, cy + ch / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('ΔE', 0, 0); ctx.restore();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(maxDE <= 3 ? 'every step under ΔE 3 — neutral, well-tracked grey' : `peak ΔE ${maxDE.toFixed(1)} — visible tint where the curve leaves the green band`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Grayscale());
