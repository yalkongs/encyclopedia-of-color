import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { thinLensImage } from '@core/math/lens';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ThinLens {
  private stage: CanvasStage;
  private so = 240; // cm
  private f = 100;  // cm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.so = hydrateNumber('so', 240);
    this.f = hydrateNumber('f', 100);
    (document.getElementById('so') as EncSlider).value = this.so;
    (document.getElementById('f') as EncSlider).value = this.f;
    registerStateParam('so', () => this.so);
    registerStateParam('f', () => this.f);
    for (const id of ['so', 'f']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'so') this.so = v; else this.f = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.so = 240; this.f = 100;
      (document.getElementById('so') as EncSlider).value = 240;
      (document.getElementById('f') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const lensX = w * 0.46, cy = h * 0.52;
    const sx = (w * 0.40) / 400;             // cm → px (object up to 400cm fits on the left)
    const hObjPx = Math.min(h * 0.26, 70);

    const { imageDist: si, magnification: m, real } = thinLensImage(this.so, this.f);

    // Optical axis.
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, cy); ctx.lineTo(w - 8, cy); ctx.stroke();

    // Lens (vertical double-arrow ellipse line).
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lensX, cy - h * 0.34); ctx.lineTo(lensX, cy + h * 0.34); ctx.stroke();
    ctx.fillStyle = theme.slate;
    for (const sgn of [-1, 1]) {
      const ty = cy + sgn * h * 0.34;
      ctx.beginPath(); ctx.moveTo(lensX, ty); ctx.lineTo(lensX - 6, ty - sgn * 9); ctx.lineTo(lensX + 6, ty - sgn * 9); ctx.closePath(); ctx.fill();
    }

    // Focal points.
    const Fl = lensX - this.f * sx, Fr = lensX + this.f * sx;
    ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
    for (const [fx, lab] of [[Fl, 'F'], [Fr, "F'"]] as const) {
      ctx.beginPath(); ctx.arc(fx, cy, 3, 0, 2 * Math.PI); ctx.fill();
      ctx.fillText(lab, fx - 4, cy + 16);
    }

    // Object (upright arrow, left of lens).
    const objX = lensX - this.so * sx;
    const tip = { x: objX, y: cy - hObjPx };
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(objX, cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x - 5, tip.y + 9); ctx.lineTo(tip.x + 5, tip.y + 9); ctx.closePath(); ctx.fill();

    // Image geometry.
    const imgX = lensX + si * sx;
    const imgTipY = cy - m * hObjPx;

    // Three rays (incoming solid → refracted).
    const drawRay = (P: { x: number; y: number }, dir: { x: number; y: number }, col: string) => {
      // Incoming: object tip → P.
      ctx.strokeStyle = col; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(P.x, P.y); ctx.stroke();
      // Refracted: from P toward right edge.
      const len = (w - 8 - P.x) / (dir.x || 1e-6);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + dir.x * len, P.y + dir.y * len); ctx.stroke();
    };
    const norm = (v: { x: number; y: number }) => { const m2 = Math.hypot(v.x, v.y) || 1; return { x: v.x / m2, y: v.y / m2 }; };

    // Ray 1 parallel → through F'.
    const P1 = { x: lensX, y: tip.y };
    drawRay(P1, norm({ x: Fr - P1.x, y: cy - P1.y }), theme.crimsonAlpha(0.8));
    // Ray 2 chief (through centre, undeviated).
    const P2 = { x: lensX, y: cy };
    drawRay(P2, norm({ x: P2.x - tip.x, y: P2.y - tip.y }), theme.slateAlpha(0.8));
    // Ray 3 through F → refracts parallel.
    const tF = (lensX - tip.x) / (Fl - tip.x);
    const y3 = tip.y + tF * (cy - tip.y);
    const P3 = { x: lensX, y: y3 };
    drawRay(P3, { x: 1, y: 0 }, theme.goldAlpha(0.8));

    // Virtual-image dashed back-extensions.
    if (!real) {
      ctx.strokeStyle = theme.inkAlpha(0.35); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      for (const P of [P1, P2, P3]) {
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(imgX, imgTipY); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Image arrow.
    if (isFinite(imgX) && Math.abs(imgX - lensX) < w) {
      ctx.strokeStyle = real ? theme.crimson : theme.inkAlpha(0.6); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(imgX, cy); ctx.lineTo(imgX, imgTipY); ctx.stroke();
      ctx.fillStyle = real ? theme.crimson : theme.inkAlpha(0.6);
      const ah = imgTipY < cy ? 9 : -9;
      ctx.beginPath(); ctx.moveTo(imgX, imgTipY); ctx.lineTo(imgX - 5, imgTipY + ah); ctx.lineTo(imgX + 5, imgTipY + ah); ctx.closePath(); ctx.fill();
    }

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`s_o = ${this.so} cm   f = ${this.f} cm`, 16, 28);
    if (isFinite(si)) {
      ctx.fillText(`s_i = ${si.toFixed(1)} cm   m = ${m.toFixed(2)}`, 16, 50);
      ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(real ? 'real, inverted image' : 'virtual, upright image', 16, 70);
    } else {
      ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText('object at focal point — image at infinity', 16, 70);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new ThinLens());
