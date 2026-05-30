import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const N = 1.52; // crown glass

class PrismGeom {
  private stage: CanvasStage;
  private a = 60;
  private t = 48;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.a = hydrateNumber('a', 60);
    this.t = hydrateNumber('t', 48);
    const s1 = document.getElementById('a') as EncSlider; s1.value = this.a;
    const s2 = document.getElementById('t') as EncSlider; s2.value = this.t;
    s1.addEventListener('input', (e) => { this.a = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    s2.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('a', () => Math.round(this.a));
    registerStateParam('t', () => Math.round(this.t));
    document.addEventListener('reset-params', () => {
      this.a = 60; this.t = 48; s1.value = 60; s2.value = 48; this.draw(); notifyStateChange();
    });
  }

  private deviation(): { d: number | null; tr: number; te: number | null } {
    const A = this.a * Math.PI / 180;
    const ti = this.t * Math.PI / 180;
    const tr = Math.asin(Math.sin(ti) / N);
    const tr2 = A - tr;
    const s = N * Math.sin(tr2);
    if (s > 1) return { d: null, tr, te: null };
    const te = Math.asin(s);
    return { d: ti + te - A, tr, te };
  }

  private dMin(): number {
    // δmin: solve sin((δmin+A)/2) = n sin(A/2)
    const A = this.a * Math.PI / 180;
    const x = N * Math.sin(A / 2);
    if (x > 1) return Infinity;
    return 2 * Math.asin(x) - A;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const { d, tr, te } = this.deviation();
    const dminRad = this.dMin();
    const dminDeg = dminRad * 180 / Math.PI;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`A=${this.a}° · θᵢ=${this.t}° · n=${N} · δ=${d ? (d * 180 / Math.PI).toFixed(1) : 'TIR'}° · δmin=${dminDeg.toFixed(1)}°`, M, M);

    // Prism geometry
    const cx = w / 2 - 50, cy = h / 2 + 40, base = 240;
    const A = this.a * Math.PI / 180;
    const apexH = (base / 2) / Math.tan(A / 2);
    const apex = { x: cx, y: cy - apexH };
    const left = { x: cx - base / 2, y: cy };
    const right = { x: cx + base / 2, y: cy };
    g.fillStyle = 'rgba(180,210,230,0.35)';
    g.beginPath(); g.moveTo(apex.x, apex.y); g.lineTo(left.x, left.y); g.lineTo(right.x, right.y); g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.stroke();

    // Ray trace
    if (d !== null && te !== null) {
      // Entry on left face, midway between apex and base
      const midL = { x: (apex.x + left.x) / 2, y: (apex.y + left.y) / 2 };
      // Incoming ray: enters at angle θᵢ from left-face normal
      const leftFaceAngle = Math.atan2(left.y - apex.y, left.x - apex.x); // direction of left face
      const leftNormalAngle = leftFaceAngle - Math.PI / 2; // outward normal
      // Incoming ray comes from direction (leftNormalAngle + thetaI from normal, opposite side)
      const inDirAngle = leftNormalAngle + Math.PI + this.t * Math.PI / 180;
      const inStart = { x: midL.x + Math.cos(inDirAngle) * 220, y: midL.y + Math.sin(inDirAngle) * 220 };
      g.strokeStyle = '#c2382c'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(inStart.x, inStart.y); g.lineTo(midL.x, midL.y); g.stroke();
      // Inside ray
      const insideAngle = leftNormalAngle + Math.PI + tr;
      // Find exit point on right face
      const rightFaceAngle = Math.atan2(right.y - apex.y, right.x - apex.x);
      const rightNormalAngle = rightFaceAngle - Math.PI / 2;
      // Use simple straight-line: travel inside until intersection with right face
      // Parametric: P = midL + t * (cos, sin); right face: from apex to right
      const dx = Math.cos(insideAngle - Math.PI), dy = Math.sin(insideAngle - Math.PI);
      // Intersect line through apex with direction right - apex
      const rdx = (right.x - apex.x), rdy = (right.y - apex.y);
      // Solve midL + t*(dx,dy) = apex + s*(rdx,rdy)
      const denom = dx * (-rdy) - dy * (-rdx);
      const s = ((midL.x - apex.x) * (-dy) - (midL.y - apex.y) * (-dx)) / -denom;
      void s;
      const tparam = ((apex.x - midL.x) * (-rdy) - (apex.y - midL.y) * (-rdx)) / denom;
      const midR = { x: midL.x + dx * tparam, y: midL.y + dy * tparam };
      g.strokeStyle = '#3a76a8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(midL.x, midL.y); g.lineTo(midR.x, midR.y); g.stroke();
      // Outgoing
      const outAngle = rightNormalAngle + te;
      const outEnd = { x: midR.x + Math.cos(outAngle) * 220, y: midR.y + Math.sin(outAngle) * 220 };
      g.strokeStyle = '#c8a020'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(midR.x, midR.y); g.lineTo(outEnd.x, outEnd.y); g.stroke();
    }

    // Deviation curve
    const px = M, py = M + 40, pw = (w - 2 * M) * 0.4, ph = 160;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText(`δ vs θᵢ (A=${this.a}°)`, px + pw / 2, py - 4);
    const X = (ti: number) => px + (ti - 10) / 70 * pw;
    const Y = (dd: number) => py + (1 - (dd) / 80) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    let drew = false;
    for (let ti = 10; ti <= 80; ti++) {
      const A0 = this.a * Math.PI / 180;
      const tiR = ti * Math.PI / 180;
      const trR = Math.asin(Math.sin(tiR) / N);
      const trR2 = A0 - trR;
      const ss = N * Math.sin(trR2);
      if (ss > 1) continue;
      const teR = Math.asin(ss);
      const dd = (tiR + teR - A0) * 180 / Math.PI;
      const x0 = X(ti), y0 = Y(dd);
      if (!drew) { g.moveTo(x0, y0); drew = true; } else g.lineTo(x0, y0);
    }
    g.stroke();
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(px, Y(dminDeg)); g.lineTo(px + pw, Y(dminDeg)); g.stroke(); g.setLineDash([]);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'right';
    g.fillText(`δmin=${dminDeg.toFixed(1)}°`, px + pw - 4, Y(dminDeg) - 4);
    if (d !== null) {
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(X(this.t), Y(d * 180 / Math.PI), 5, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('At δmin the ray inside the prism is parallel to the base; this is the configuration used in spectrometer n-measurements.', M, h - M);
  }
}

new PrismGeom();
