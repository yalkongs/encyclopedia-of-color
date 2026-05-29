import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class VisualWeight {
  private stage: CanvasStage;
  private ax = 70; private ar = 34;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ax = hydrateNumber('ax', 70); this.ar = hydrateNumber('ar', 34);
    for (const k of ['ax', 'ar'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => { this.ax = 70; this.ar = 34; (document.getElementById('ax') as EncSlider).value = 70; (document.getElementById('ar') as EncSlider).value = 34; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const fx = 24, fy = 24, fw = w - 48, fh = h - 70;
    ctx.fillStyle = theme.paper; ctx.fillRect(fx, fy, fw, fh);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(fx, fy, fw, fh);

    // Arnheim position factor: top heavier, right heavier
    const posF = (x: number, y: number) => 1 + 0.35 * (1 - (y - fy) / fh) + 0.25 * (x - fx) / fw;
    const A = { x: fx + (this.ax / 100) * fw, y: fy + fh * 0.32, r: this.ar };
    const B = { x: fx + fw * 0.26, y: fy + fh * 0.72, r: 30 };
    const elems = [A, B].map((e) => ({ ...e, wt: (e.r * e.r) * posF(e.x, e.y) }));
    const totW = elems.reduce((s, e) => s + e.wt, 0);

    // isobars + disks
    for (const e of elems) {
      const reach = Math.sqrt(e.wt) * 1.5;
      for (let k = 3; k >= 1; k--) {
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + (reach * k) / 3, 0, Math.PI * 2);
        ctx.strokeStyle = theme.slateAlpha(0.13 + 0.05 * (3 - k)); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fillStyle = theme.slate; ctx.fill();
    }

    // centroids
    const wc = { x: elems.reduce((s, e) => s + e.wt * e.x, 0) / totW, y: elems.reduce((s, e) => s + e.wt * e.y, 0) / totW };
    const gc = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const mark = (p: { x: number; y: number }, col: string, lbl: string) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(p.x - 9, p.y); ctx.lineTo(p.x + 9, p.y); ctx.moveTo(p.x, p.y - 9); ctx.lineTo(p.x, p.y + 9); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(lbl, p.x + 12, p.y - 6);
    };
    // frame centre reference
    mark({ x: fx + fw / 2, y: fy + fh / 2 }, theme.inkAlpha(0.3), 'frame centre');
    mark(gc, theme.inkMute, 'geometric');
    mark(wc, theme.goldDeep, 'weight centroid');

    const offset = Math.hypot(wc.x - gc.x, wc.y - gc.y);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`weight centroid sits ${offset.toFixed(0)} px from the geometric midpoint — Arnheim's heuristic (size² · contrast · position)`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new VisualWeight());
