import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const gainOf = (paper: number) => 0.03 + 0.27 * (paper / 100);
const physArea = (an: number, g: number) => Math.min(1, an + g * 4 * an * (1 - an));

class DotAbsorption {
  private stage: CanvasStage;
  private paper = 45;
  private tint = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.paper = hydrateNumber('paper', 45);
    this.tint = hydrateNumber('tint', 50);
    const sp = document.getElementById('paper') as EncSlider;
    sp.value = this.paper;
    sp.addEventListener('input', (e) => { this.paper = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('paper', () => Math.round(this.paper));
    const st = document.getElementById('tint') as EncSlider;
    st.value = this.tint;
    st.addEventListener('input', (e) => { this.tint = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tint', () => Math.round(this.tint));
    document.addEventListener('reset-params', () => { this.paper = 45; this.tint = 50; sp.value = 45; st.value = 50; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, w, h);
    const g = gainOf(this.paper), an = this.tint / 100, am = physArea(an, g);

    // left: magnified dots — nominal ring + grown filled dot
    const px0 = 36, py0 = 56, pw = Math.min(w * 0.46, h * 0.78), ph = pw;
    const cell = pw / 4;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const cx = px0 + (i + 0.5) * cell, cy = py0 + (j + 0.5) * cell;
      ctx.fillStyle = '#1a1714';
      ctx.beginPath(); ctx.arc(cx, cy, cell * Math.sqrt(am / Math.PI), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(cx, cy, cell * Math.sqrt(an / Math.PI), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(px0, py0, pw, ph);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('dashed = nominal · filled = printed', px0, py0 - 12);

    // right: tone-value-increase curve
    const gx = px0 + pw + 70, gy = 56, gw = w - gx - 50, gh = ph;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { const x = gx + (i / 10) * gw, y = gy + (i / 10) * gh; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    // diagonal (no gain)
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy); ctx.stroke(); ctx.setLineDash([]);
    // gain curve
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const a = i / 100, ap = physArea(a, g); const x = gx + a * gw, y = gy + gh - ap * gh; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // probe
    const px = gx + an * gw, py = gy + gh - am * gh;
    ctx.strokeStyle = theme.slate; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, gy + gh); ctx.lineTo(px, py); ctx.lineTo(gx, py); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.gold; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('nominal area →', gx + gw / 2, gy + gh + 22);
    ctx.save(); ctx.translate(gx - 16, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('printed area', 0, 0); ctx.restore();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.tint)}% nominal prints as ${Math.round(am * 100)}% — a ${Math.round((am - an) * 100)}% tone-value increase on ${this.paper < 33 ? 'coated' : this.paper < 66 ? 'uncoated' : 'newsprint-like'} stock`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new DotAbsorption());
