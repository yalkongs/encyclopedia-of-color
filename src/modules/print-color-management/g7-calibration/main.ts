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

const STEPS = 11;

class G7Calibration {
  private stage: CanvasStage;
  private drift = 60;
  private cal = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.drift = hydrateNumber('drift', 60);
    this.cal = hydrateFromUrl('cal') ?? 'off';
    const s = document.getElementById('drift') as EncSlider;
    s.value = this.drift;
    s.addEventListener('input', (e) => { this.drift = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('drift', () => Math.round(this.drift));
    const t = document.getElementById('cal') as EncToggle;
    t.value = this.cal;
    t.addEventListener('change', (e) => { this.cal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cal', () => this.cal);
    document.addEventListener('reset-params', () => { this.drift = 60; this.cal = 'off'; s.value = 60; t.value = 'off'; this.draw(); notifyStateChange(); });
  }

  // measured a*, b* for a CMY ramp step at fractional tone t (0..1) with press drift d, calibrated or not
  private cast(t: number, d: number, on: boolean): { a: number; b: number; D: number } {
    const k = on ? 0 : d / 100;                          // cast magnitude (calibration zeroes it)
    const bump = 4 * t * (1 - t);                        // largest in midtones
    const a = k * 12 * bump * 0.9;                       // a* drift (toward red)
    const b = -k * 14 * bump;                            // b* drift (toward blue)
    const Dideal = -Math.log10(Math.max(0.04, 1 - 0.95 * t));      // NPDC-like ideal density
    const Dmeas = Dideal + k * 0.18 * bump - k * 0.08 * t;          // press drifts off NPDC, calibration restores
    return { a, b, D: on ? Dideal : Dmeas };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const on = this.cal === 'on';
    const d = this.drift;

    // ramp swatches across the top
    const rx0 = 40, ry0 = 50, rw = w - 80, rh = 64;
    for (let i = 0; i < STEPS; i++) {
      const t = i / (STEPS - 1);
      const { a, b } = this.cast(t, d, on);
      const base = Math.round((1 - t) * 235 + 15);
      const r = Math.max(0, Math.min(255, base + a * 1.6));
      const g = Math.max(0, Math.min(255, base - a * 0.5 - b * 0.8));
      const bl = Math.max(0, Math.min(255, base - b * 1.8));
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${bl | 0})`;
      ctx.fillRect(rx0 + (i / STEPS) * rw, ry0, rw / STEPS + 0.5, rh);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(rx0, ry0, rw, rh);
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('measured CMY grey ramp', rx0, ry0 - 10);

    // NPDC chart (density vs tone)
    const gx = 60, gy = ry0 + rh + 60, gw = (w - 100) * 0.5, gh = h - gy - 80;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) { const x = gx + (i / 5) * gw, y = gy + (i / 5) * gh; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    const Dmax = 1.7;
    const X = (t: number) => gx + t * gw, Y = (D: number) => gy + gh - (D / Dmax) * gh;
    // ideal NPDC
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const t = i / 100, D = this.cast(t, 0, true).D; const x = X(t), y = Y(D); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // measured curve
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const t = i / 100, D = this.cast(t, d, on).D; const x = X(t), y = Y(D); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('tone (CMY %)', gx + gw / 2, gy + gh + 22); ctx.save(); ctx.translate(gx - 36, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('neutral density', 0, 0); ctx.restore();

    // a*b* chart
    const hx = gx + gw + 50, hy = gy, hw = w - hx - 30, hh = gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { const x = hx + ((i + 3) / 6) * hw; ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, hy + hh); ctx.stroke(); }
    for (let i = -3; i <= 3; i++) { const y = hy + ((i + 3) / 6) * hh; ctx.beginPath(); ctx.moveTo(hx, y); ctx.lineTo(hx + hw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(hx, hy, hw, hh);
    const Ha = (a: number) => hx + ((a + 18) / 36) * hw, Hb = (b: number) => hy + hh - ((b + 18) / 36) * hh;
    // target zero-zero box
    ctx.fillStyle = 'rgba(46,125,79,0.14)'; ctx.fillRect(Ha(-2), Hb(2), Ha(2) - Ha(-2), Hb(-2) - Hb(2));
    // measured per-step
    for (let i = 0; i < STEPS; i++) {
      const t = i / (STEPS - 1); const { a, b } = this.cast(t, d, on);
      ctx.fillStyle = on ? theme.gold : theme.crimson;
      ctx.beginPath(); ctx.arc(Ha(a), Hb(b), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('a*', hx + hw / 2, hy + hh + 22); ctx.save(); ctx.translate(hx - 24, hy + hh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('b*', 0, 0); ctx.restore();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(on
      ? 'G7 on — measured density tracks the NPDC and every step lands inside the neutral a*b* target box'
      : `uncalibrated · drift ${Math.round(d)}% — the ramp bends off NPDC and the midtones cast colour`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new G7Calibration());
