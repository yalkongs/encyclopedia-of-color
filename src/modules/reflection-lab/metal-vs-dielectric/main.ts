import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

/**
 * Complex Fresnel: n_eff = n - i·k (extinction coefficient). For metals k is large.
 * R_s(θ) and R_p(θ) computed from full complex algebra, with intensity = |r|².
 * We average for unpolarised reference.
 */
function complexFresnel(thetaRad: number, n1: number, n2: number, k2: number): { rs: number; rp: number } {
  // n_t = n2 - i·k2
  // sin θ_t = (n1/n_t) sin θ_i
  // We compute everything with complex arithmetic in {re, im}.
  type C = { r: number; i: number };
  const Csq = (a: C): C => ({ r: a.r * a.r - a.i * a.i, i: 2 * a.r * a.i });
  const Cmul = (a: C, b: C): C => ({ r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r });
  const Cdiv = (a: C, b: C): C => {
    const d = b.r * b.r + b.i * b.i;
    return { r: (a.r * b.r + a.i * b.i) / d, i: (a.i * b.r - a.r * b.i) / d };
  };
  const Csub = (a: C, b: C): C => ({ r: a.r - b.r, i: a.i - b.i });
  const Cadd = (a: C, b: C): C => ({ r: a.r + b.r, i: a.i + b.i });
  const Csqrt = (a: C): C => {
    const r = Math.sqrt(Math.hypot(a.r, a.i));
    const theta = Math.atan2(a.i, a.r) / 2;
    return { r: r * Math.cos(theta), i: r * Math.sin(theta) };
  };
  const Cabs2 = (a: C): number => a.r * a.r + a.i * a.i;

  const ci = { r: Math.cos(thetaRad), i: 0 };
  const si = { r: Math.sin(thetaRad), i: 0 };
  const nt: C = { r: n2, i: -k2 };
  const sinT = Cdiv({ r: n1 * si.r, i: 0 }, nt);
  const cosT = Csqrt(Csub({ r: 1, i: 0 }, Csq(sinT)));

  const n1Ci = { r: n1 * ci.r, i: 0 };
  const ntCi = { r: nt.r * ci.r, i: nt.i * ci.r };
  const n1Ct = { r: n1 * cosT.r, i: n1 * cosT.i };
  const ntCt = Cmul(nt, cosT);

  const rs = Cdiv(Csub(n1Ci, ntCt), Cadd(n1Ci, ntCt));
  const rp = Cdiv(Csub(ntCi, n1Ct), Cadd(ntCi, n1Ct));
  return { rs: Cabs2(rs), rp: Cabs2(rp) };
}

interface Material { name: string; n: number; k: number }
const MATERIALS: Material[] = [
  { name: 'glass',    n: 1.5,  k: 0 },
  { name: 'water',    n: 1.33, k: 0 },
  { name: 'aluminum', n: 1.0,  k: 6.5 },
  { name: 'silver',   n: 0.15, k: 3.5 },
];

class MetalDielectric {
  private stage: CanvasStage;
  private mat = 'glass';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const m = hydrateFromUrl('mat');
    if (m && MATERIALS.some((mm) => mm.name === m)) this.mat = m;
    (document.getElementById('mat') as EncToggle).value = this.mat;
    registerStateParam('mat', () => (this.mat === 'glass' ? undefined : this.mat));
    (document.getElementById('mat') as EncToggle).addEventListener('change', (e: Event) => {
      this.mat = (e as CustomEvent).detail.value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.mat = 'glass';
      (document.getElementById('mat') as EncToggle).value = 'glass';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const material = MATERIALS.find((mm) => mm.name === this.mat)!;
    const padL = 60, padR = 40, padT = 40, padB = 60;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const x0 = padL, y0 = h - padB, x1 = padL + plotW, y1 = padT;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
    ctx.stroke();

    ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = axisStyle.label;
    for (let t = 0; t <= 90; t += 15) {
      const x = x0 + (t / 90) * plotW;
      ctx.strokeStyle = axisStyle.gridMajor;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 4); ctx.stroke();
      ctx.fillText(`${t}°`, x - 10, y0 + 18);
    }
    for (let r = 0; r <= 1; r += 0.25) {
      const y = y0 - r * plotH;
      ctx.strokeStyle = axisStyle.grid; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(r.toFixed(2), x0 - 30, y + 4);
    }
    ctx.fillText('θ_incident', x1 - 50, y0 + 38);
    ctx.fillText('R', x0 - 24, y1 - 6);

    ctx.lineWidth = 2;
    // R_s
    ctx.strokeStyle = theme.ink;
    ctx.beginPath();
    for (let t = 0; t <= 89.5; t += 0.5) {
      const { rs } = complexFresnel(t * DEG, 1, material.n, material.k);
      const x = x0 + (t / 90) * plotW;
      const y = y0 - rs * plotH;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // R_p
    ctx.strokeStyle = theme.crimson;
    ctx.beginPath();
    for (let t = 0; t <= 89.5; t += 0.5) {
      const { rp } = complexFresnel(t * DEG, 1, material.n, material.k);
      const x = x0 + (t / 90) * plotW;
      const y = y0 - rp * plotH;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`material = ${material.name}`, 16, 28);
    ctx.fillText(`n = ${material.n.toFixed(2)}    k = ${material.k.toFixed(2)}`, 16, 50);
    ctx.fillStyle = material.k > 1 ? theme.crimson : theme.slate;
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(material.k > 1
                  ? 'METAL — no Brewster dip, high R at every angle'
                  : 'DIELECTRIC — R_p dips to zero at Brewster',
                 16, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new MetalDielectric());
