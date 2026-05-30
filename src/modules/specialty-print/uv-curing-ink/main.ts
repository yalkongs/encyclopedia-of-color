import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const COLS = 44, ROWS = 22;
const RADICAL_LIFE = 70; // frames a radical stays reactive before settling into polymer
const RESET_HOLD = 90;   // frames to hold a fully cured film before refreshing the demo

class UvCuring {
  private stage: CanvasStage;
  private uv = 'on';
  private intensity = 55;
  private state: number[] = new Array(COLS * ROWS).fill(0); // 0 monomer · 1 radical · 2 polymer
  private age: number[] = new Array(COLS * ROWS).fill(0);
  private prev = -1;
  private holdAfterCure = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.uv = hydrateFromUrl('uv') ?? 'on';
    this.intensity = hydrateNumber('intensity', 55);
    const t = document.getElementById('uv') as EncToggle;
    t.value = this.uv;
    t.addEventListener('change', (e) => { this.uv = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('uv', () => this.uv);
    const s = document.getElementById('intensity') as EncSlider;
    s.value = this.intensity;
    s.addEventListener('input', (e) => { this.intensity = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('intensity', () => Math.round(this.intensity));
    document.addEventListener('reset-params', () => {
      this.uv = 'on'; this.intensity = 55; t.value = 'on'; s.value = 55;
      this.state.fill(0); this.age.fill(0); notifyStateChange();
    });
    startAnimation((tt) => this.frame(tt));
  }

  private step() {
    const next = this.state.slice();
    // photoinitiator activations from UV lamp
    if (this.uv === 'on') {
      const pAct = (this.intensity / 100) * 0.0008;
      for (let i = 0; i < this.state.length; i++) if (this.state[i] === 0 && Math.random() < pAct) { next[i] = 1; this.age[i] = 0; }
    }
    // chain propagation from radicals to neighbours
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (this.state[i] !== 1) continue;
      const nbrs = [r - 1, r + 1, c - 1, c + 1];
      const di = [-COLS, COLS, -1, 1];
      for (let k = 0; k < 4; k++) {
        if ((k < 2 ? nbrs[k] < 0 || nbrs[k] >= ROWS : nbrs[k] < 0 || nbrs[k] >= COLS)) continue;
        const j = i + di[k];
        if (this.state[j] === 0 && Math.random() < 0.06) { next[j] = 1; this.age[j] = 0; }
      }
      this.age[i]++;
      if (this.age[i] > RADICAL_LIFE) next[i] = 2;
    }
    this.state = next;
    // when the film is fully cured, hold then refresh so the demo loops
    const monomerLeft = this.state.some((s) => s === 0);
    const radicalLeft = this.state.some((s) => s === 1);
    if (!monomerLeft && !radicalLeft) {
      this.holdAfterCure++;
      if (this.holdAfterCure > RESET_HOLD) { this.state.fill(0); this.age.fill(0); this.holdAfterCure = 0; }
    } else this.holdAfterCure = 0;
  }

  private frame(t: number) {
    const dt = this.prev < 0 ? 1 : Math.min(3, Math.max(1, Math.round((t - this.prev) * 30)));
    this.prev = t;
    for (let k = 0; k < dt; k++) this.step();
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0e0d10'; ctx.fillRect(0, 0, w, h);
    const x0 = 30, y0 = 30, x1 = w - 30, y1 = h - 60;
    const cw = (x1 - x0) / COLS, ch = (y1 - y0) / ROWS, R = Math.min(cw, ch) * 0.34;
    // bonds first
    ctx.strokeStyle = '#6dbfae'; ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c; if (this.state[i] === 0) continue;
      const x = x0 + (c + 0.5) * cw, y = y0 + (r + 0.5) * ch;
      if (c + 1 < COLS && this.state[i + 1] >= 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cw, y); ctx.stroke(); }
      if (r + 1 < ROWS && this.state[i + COLS] >= 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + ch); ctx.stroke(); }
    }
    // particles
    let cured = 0, radicals = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, s = this.state[i];
      const x = x0 + (c + 0.5) * cw, y = y0 + (r + 0.5) * ch;
      ctx.fillStyle = s === 0 ? 'rgba(220,215,205,0.85)' : s === 1 ? '#e85b4a' : '#3b8f7e';
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      if (s === 2) cured++; else if (s === 1) radicals++;
    }
    const pct = (cured / this.state.length) * 100;
    ctx.fillStyle = '#e5e2da'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('● monomer   ● radical   ● polymer', x0, y0 - 12);
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.uv === 'on'
      ? `UV on at ${Math.round(this.intensity)}% — ${radicals} radicals propagating · ${pct.toFixed(0)}% cured`
      : `UV off — chains stop almost immediately · ${pct.toFixed(0)}% cured`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new UvCuring());
