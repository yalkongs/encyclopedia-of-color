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
import { reinhard, reinhardExtended, acesNarkowicz, hable } from '@core/math/tonemap';

const X_MAX = 8;
const OPS: Record<string, (x: number) => number> = {
  clip: (x) => Math.min(1, x),
  reinhard,
  reinhardExtended: (x) => reinhardExtended(x, 4),
  aces: acesNarkowicz,
  hable: (x) => hable(x, 11.2),
};
const LABELS: Record<string, string> = { clip: 'hard clip', reinhard: 'Reinhard', reinhardExtended: 'Reinhard extended (W=4)', aces: 'ACES (Narkowicz fit)', hable: 'Hable filmic (W=11.2)' };

class ToneMap {
  private stage: CanvasStage;
  private op = 'aces';
  private exposure = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.op = hydrateFromUrl('op') ?? 'aces';
    this.exposure = hydrateNumber('exposure', 0);
    const t = document.getElementById('op') as EncToggle;
    t.value = this.op;
    t.addEventListener('change', (e) => { this.op = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('op', () => this.op);
    const s = document.getElementById('exposure') as EncSlider;
    s.value = this.exposure;
    s.addEventListener('input', (e) => { this.exposure = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('exposure', () => this.exposure.toFixed(1));
    document.addEventListener('reset-params', () => { this.op = 'aces'; this.exposure = 0; t.value = 'aces'; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 60, gy = 30, gw = w - 104, gh = h - 190;
    const ev = Math.pow(2, this.exposure);

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { const x = gx + (i / 8) * gw; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); }
    for (let i = 0; i <= 5; i++) { const y = gy + (i / 5) * gh; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    const plot = (f: (x: number) => number, stroke: string, lw: number, dash: number[] = []) => {
      ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const x = (i / 300) * X_MAX; const y = Math.max(0, Math.min(1, f(x * ev))); const px = gx + (x / X_MAX) * gw, py = gy + gh - y * gh; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke(); ctx.restore();
    };
    // faint comparison of all operators
    for (const k of Object.keys(OPS)) if (k !== this.op) plot(OPS[k], theme.inkAlpha(0.18), 1);
    plot(OPS[this.op], theme.crimson, 2.6);                  // selected

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('scene luminance (linear, ×exposure)', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 40, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('display 0–1', 0, 0); ctx.restore();

    // preview strip: ramp 0..X_MAX through operator
    const sy = gy + gh + 48, sh = 56;
    const f = OPS[this.op];
    for (let i = 0; i < 300; i++) {
      const x = (i / 300) * X_MAX; const y = Math.max(0, Math.min(1, f(x * ev)));
      const g = Math.round(Math.pow(y, 1 / 2.2) * 255); // gamma-encode for screen
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(gx + (i / 300) * gw, sy, gw / 300 + 1, sh);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(gx, sy, gw, sh);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('scene ramp 0 →', gx, sy + sh + 16); ctx.textAlign = 'right'; ctx.fillText(`${X_MAX.toFixed(0)}× tone-mapped`, gx + gw, sy + sh + 16);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${LABELS[this.op]} at ${this.exposure >= 0 ? '+' : ''}${this.exposure.toFixed(1)} EV`, gx + gw / 2, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new ToneMap());
