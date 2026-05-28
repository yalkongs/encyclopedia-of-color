import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { snellRefract, DEG, RAD } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class RefractionDirection {
  private stage: CanvasStage;
  private mode: 'enter-dense' | 'leave-dense' = 'enter-dense';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const m = hydrateFromUrl('m');
    if (m === 'leave-dense' || m === 'enter-dense') this.mode = m;
    (document.getElementById('mode') as EncToggle).value = this.mode;
    registerStateParam('m', () => (this.mode === 'enter-dense' ? undefined : 'leave-dense'));
    (document.getElementById('mode') as EncToggle).addEventListener('change', (e: Event) => {
      this.mode = (e as CustomEvent).detail.value as typeof this.mode;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.mode = 'enter-dense';
      (document.getElementById('mode') as EncToggle).value = 'enter-dense';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    const n1 = this.mode === 'enter-dense' ? 1.00 : 1.50;
    const n2 = this.mode === 'enter-dense' ? 1.50 : 1.00;

    ctx.fillStyle = theme.slateAlpha(0.07);
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = axisStyle.gridMajor;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.setLineDash([]);

    const t1 = 35 * DEG;
    const t2 = snellRefract(n1, n2, t1)!;
    const len = Math.min(w, h) * 0.4;
    const ix = cx - Math.sin(t1) * len, iy = cy - Math.cos(t1) * len;
    const tx = cx + Math.sin(t2) * len, ty = cy + Math.cos(t2) * len;

    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.strokeStyle = theme.slate;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();

    // Bend direction label
    const bendsTowardNormal = t2 < t1;
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillStyle = bendsTowardNormal ? theme.crimson : theme.goldDeep;
    ctx.fillText(bendsTowardNormal ? '→ bends TOWARD normal' : '→ bends AWAY from normal',
                 w / 2 - 140, cy + len * 0.85);

    // Labels
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`n₁ = ${n1.toFixed(2)}  (upper)`, 16, cy - 12);
    ctx.fillText(`n₂ = ${n2.toFixed(2)}  (lower)`, 16, cy + 22);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`θ₁ = 35°  →  θ₂ = ${(t2 * RAD).toFixed(1)}°`, 16, 24);
  }
}
window.addEventListener('DOMContentLoaded', () => new RefractionDirection());
