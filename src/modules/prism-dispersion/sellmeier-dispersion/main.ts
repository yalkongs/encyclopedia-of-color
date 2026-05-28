import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG, RAD, snellRefract, sellmeierN, SELLMEIER } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const GLASS_BUNDLES = [
  { key: 'BK7', B: SELLMEIER.BK7.B, C: SELLMEIER.BK7.C },
  { key: 'Silica', B: SELLMEIER.FUSED_SILICA.B, C: SELLMEIER.FUSED_SILICA.C },
  { key: 'SF11', B: SELLMEIER.SF11.B, C: SELLMEIER.SF11.C },
];

// Approximate visible-spectrum RGB for a wavelength λ (nm).
function lambdaToColor(lam: number): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  let s = 1;
  if (lam < 420)      s = 0.3 + 0.7 * (lam - 380) / 40;
  else if (lam > 700) s = 0.3 + 0.7 * (780 - lam) / 80;
  const to8 = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v * s)));
  return `rgb(${to8(r)},${to8(g)},${to8(b)})`;
}

class SellmeierDispersion {
  private stage: CanvasStage;
  private glass = 0;
  private alpha = 60;
  private theta1 = 48;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.glass = hydrateNumber('glass', 0);
    this.alpha = hydrateNumber('alpha', 60);
    this.theta1 = hydrateNumber('theta', 48);
    (document.getElementById('glass') as EncSlider).value = this.glass;
    (document.getElementById('alpha') as EncSlider).value = this.alpha;
    (document.getElementById('theta') as EncSlider).value = this.theta1;
    registerStateParam('glass', () => this.glass);
    registerStateParam('alpha', () => this.alpha);
    registerStateParam('theta', () => this.theta1);
    for (const id of ['glass', 'alpha', 'theta']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'glass') this.glass = Math.round(v);
        else if (id === 'alpha') this.alpha = v;
        else this.theta1 = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.glass = 0; this.alpha = 60; this.theta1 = 48;
      (document.getElementById('glass') as EncSlider).value = 0;
      (document.getElementById('alpha') as EncSlider).value = 60;
      (document.getElementById('theta') as EncSlider).value = 48;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Prism centred on left half.
    const cx = w * 0.32, cy = h * 0.55;
    const a = this.alpha * DEG;
    const side = Math.min(w, h) * 0.36;
    const apex = { x: cx, y: cy - side * Math.cos(a / 2) };
    const base = side;
    const lcorner = { x: cx - base * Math.sin(a / 2), y: cy + side * 0.4 };
    const rcorner = { x: cx + base * Math.sin(a / 2), y: cy + side * 0.4 };

    ctx.fillStyle = theme.slateAlpha(0.10);
    ctx.strokeStyle = theme.inkAlpha(0.55); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(lcorner.x, lcorner.y); ctx.lineTo(rcorner.x, rcorner.y); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Entry point on left face.
    const faceLeft = { from: lcorner, to: apex };
    const faceRight = { from: apex, to: rcorner };
    const pIn = lerp(faceLeft.from, faceLeft.to, 0.55);
    const nL = outwardNormal(faceLeft.from, faceLeft.to, /*leftward*/ true);
    const nLin = { x: -nL.x, y: -nL.y };
    const incDir = rotate({ x: -nL.x, y: -nL.y }, this.theta1 * DEG);
    const incFrom = { x: pIn.x - incDir.x * 140, y: pIn.y - incDir.y * 140 };

    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(incFrom.x, incFrom.y); ctx.lineTo(pIn.x, pIn.y); ctx.stroke();

    // Visible-spectrum rays.
    const samples = 60;
    let dMinLam = NaN, dMaxLam = NaN;
    let dMinVal = +Infinity, dMaxVal = -Infinity;
    const outRays: Array<{ lam: number; from: { x: number; y: number }; to: { x: number; y: number } } | null> = [];
    for (let i = 0; i < samples; i++) {
      const lam = 400 + (700 - 400) * (i / (samples - 1));
      const g = GLASS_BUNDLES[this.glass];
      const n = sellmeierN(lam, g.B as [number,number,number], g.C as [number,number,number]);
      const r1 = snellRefract(1, n, this.theta1 * DEG);
      if (r1 === null) { outRays.push(null); continue; }
      const dirIn = rotate(nLin, r1);
      const exit = lineIntersectSeg(pIn, dirIn, faceRight.from, faceRight.to);
      if (!exit) { outRays.push(null); continue; }
      const nR = outwardNormal(faceRight.from, faceRight.to, /*leftward*/ false);
      const r2 = a - r1;
      const t2 = snellRefract(n, 1, r2);
      if (t2 === null) { outRays.push(null); continue; }
      const dirOut = rotate(nR, t2);
      const outTo = { x: exit.x + dirOut.x * 280, y: exit.y + dirOut.y * 280 };
      outRays.push({ lam, from: exit, to: outTo });
      const dev = (this.theta1 * DEG + t2) - a;
      if (dev < dMinVal) { dMinVal = dev; dMinLam = lam; }
      if (dev > dMaxVal) { dMaxVal = dev; dMaxLam = lam; }
    }
    // Draw rays inside (faint cumulative) + outside coloured.
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.3;
    for (const r of outRays) {
      if (!r) continue;
      ctx.strokeStyle = lambdaToColor(r.lam);
      ctx.beginPath(); ctx.moveTo(r.from.x, r.from.y); ctx.lineTo(r.to.x, r.to.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Glass label + spread readout.
    const glassName = GLASS_BUNDLES[this.glass].key;
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${glassName}`, 16, 30);
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    if (isFinite(dMaxVal) && isFinite(dMinVal)) {
      const spread = (dMaxVal - dMinVal) * RAD;
      ctx.fillText(`angular spread Δ = ${spread.toFixed(3)}°`, 16, 52);
      ctx.fillStyle = theme.inkMute;
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(`Δ between λ=${dMinLam.toFixed(0)} nm and λ=${dMaxLam.toFixed(0)} nm`, 16, 70);
    } else {
      ctx.fillStyle = theme.crimson;
      ctx.fillText(`TIR — adjust α or θ₁`, 16, 52);
    }
  }
}

function lerp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function rotate(v: { x: number; y: number }, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
function outwardNormal(
  from: { x: number; y: number },
  to: { x: number; y: number },
  leftward: boolean,
) {
  const v = { x: -(to.y - from.y), y: to.x - from.x };
  const m = Math.hypot(v.x, v.y) || 1;
  v.x /= m; v.y /= m;
  if (leftward ? v.x > 0 : v.x < 0) { v.x = -v.x; v.y = -v.y; }
  return v;
}
function lineIntersectSeg(
  p: { x: number; y: number }, d: { x: number; y: number },
  a: { x: number; y: number }, b: { x: number; y: number },
) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const denom = d.x * r.y - d.y * r.x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((a.x - p.x) * r.y - (a.y - p.y) * r.x) / denom;
  const u = ((a.x - p.x) * d.y - (a.y - p.y) * d.x) / denom;
  if (t < 0 || u < 0 || u > 1) return null;
  return { x: p.x + d.x * t, y: p.y + d.y * t };
}

window.addEventListener('DOMContentLoaded', () => new SellmeierDispersion());
