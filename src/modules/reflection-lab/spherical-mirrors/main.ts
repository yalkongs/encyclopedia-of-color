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

class SphericalMirrors {
  private stage: CanvasStage;
  private kind: 'concave' | 'convex' = 'concave';
  private f = 120;
  private s = 200;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const k = hydrateFromUrl('k');
    if (k === 'convex' || k === 'concave') this.kind = k;
    this.f = hydrateNumber('f', 120);
    this.s = hydrateNumber('s', 200);
    (document.getElementById('kind') as EncToggle).value = this.kind;
    (document.getElementById('f') as EncSlider).value = this.f;
    (document.getElementById('s') as EncSlider).value = this.s;
    registerStateParam('k', () => (this.kind === 'concave' ? undefined : 'convex'));
    registerStateParam('f', () => this.f);
    registerStateParam('s', () => this.s);
    (document.getElementById('kind') as EncToggle).addEventListener('change', (e: Event) => {
      this.kind = (e as CustomEvent).detail.value as typeof this.kind;
      this.draw(); notifyStateChange();
    });
    for (const id of ['f', 's']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        if (id === 'f') this.f = (e.target as EncSlider).value;
        else this.s = (e.target as EncSlider).value;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.kind = 'concave'; this.f = 120; this.s = 200;
      (document.getElementById('kind') as EncToggle).value = 'concave';
      (document.getElementById('f') as EncSlider).value = 120;
      (document.getElementById('s') as EncSlider).value = 200;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2;
    const mirrorX = w * 0.78;
    const fSigned = this.kind === 'concave' ? this.f : -this.f;
    const focalX = mirrorX - fSigned;
    // Object on left
    const objX = mirrorX - this.s;
    const objH = 50;

    // Optical axis
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // Mirror arc
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    const radius = 2 * this.f;
    if (this.kind === 'concave') {
      ctx.beginPath();
      ctx.arc(mirrorX - radius, cy, radius, -Math.PI / 8, Math.PI / 8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(mirrorX + radius, cy, radius, Math.PI - Math.PI / 8, Math.PI + Math.PI / 8);
      ctx.stroke();
    }

    // Focal & vertex markers
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(focalX, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('F', focalX - 4, cy + 18);
    ctx.beginPath(); ctx.arc(mirrorX, cy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillText('V', mirrorX - 4, cy + 18);

    // Object arrow
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(objX, cy); ctx.lineTo(objX, cy - objH); ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.moveTo(objX, cy - objH - 6); ctx.lineTo(objX - 4, cy - objH + 4); ctx.lineTo(objX + 4, cy - objH + 4); ctx.closePath(); ctx.fill();

    // Image via mirror equation 1/s + 1/s' = 1/f (signed)
    // Using f > 0 concave, f < 0 convex.
    const sp = 1 / (1 / fSigned - 1 / this.s);
    const imgX = mirrorX - sp;
    const imgH = -objH * (sp / this.s);
    const real = sp > 0;

    // Image arrow
    ctx.strokeStyle = real ? theme.slate : theme.goldAlpha(0.6);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(imgX, cy); ctx.lineTo(imgX, cy - imgH); ctx.stroke();
    ctx.fillStyle = real ? theme.slate : theme.goldAlpha(0.6);
    if (imgH < 0) {
      ctx.beginPath(); ctx.moveTo(imgX, cy - imgH + 6); ctx.lineTo(imgX - 4, cy - imgH - 4); ctx.lineTo(imgX + 4, cy - imgH - 4); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(imgX, cy - imgH - 6); ctx.lineTo(imgX - 4, cy - imgH + 4); ctx.lineTo(imgX + 4, cy - imgH + 4); ctx.closePath(); ctx.fill();
    }

    // Three principal rays from object top
    const objTop = { x: objX, y: cy - objH };
    const drawRay = (color: string, vert: number, after: { x: number; y: number }) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(objTop.x, objTop.y); ctx.lineTo(mirrorX, vert); ctx.lineTo(after.x, after.y); ctx.stroke();
    };
    // Ray 1: parallel → focal
    drawRay(theme.goldAlpha(0.6), objTop.y, { x: focalX, y: cy });
    // Ray 2: through F → parallel
    drawRay(theme.goldAlpha(0.6),
      cy + (objTop.y - cy) * ((mirrorX - focalX) / (mirrorX - objTop.x)),
      { x: 0, y: cy + (objTop.y - cy) * ((mirrorX - focalX) / (mirrorX - objTop.x)) });
    // Ray 3: through vertex → reflected (equal angles)
    ctx.strokeStyle = theme.goldAlpha(0.6); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(objTop.x, objTop.y); ctx.lineTo(mirrorX, cy);
    ctx.lineTo(objTop.x, cy + (cy - objTop.y));
    ctx.stroke();

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`f = ${fSigned} px  (${this.kind})`, 16, 28);
    ctx.fillText(`s = ${this.s} px   s' = ${sp.toFixed(0)} px`, 16, 50);
    ctx.fillText(`m = ${(sp / this.s).toFixed(2)}×`, 16, 72);
    ctx.fillStyle = real ? theme.slate : theme.goldDeep;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(real ? 'REAL image' : 'VIRTUAL image', 16, 94);
  }
}
window.addEventListener('DOMContentLoaded', () => new SphericalMirrors());
