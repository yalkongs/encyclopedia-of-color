import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { axisStyle } from '@core/render/theme';
import { DEG, RAD, snellRefract } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function totalDeviation(alphaDeg: number, n: number, theta1Deg: number): number | null {
  const a = alphaDeg * DEG;
  const t1 = theta1Deg * DEG;
  const r1 = snellRefract(1, n, t1);
  if (r1 === null) return null;
  const r2 = a - r1;
  if (Math.abs(Math.sin(r2)) * n > 1) return null;
  const t2 = snellRefract(n, 1, r2);
  if (t2 === null) return null;
  return ((t1 + t2) - a) * RAD;
}

function minimumDeviation(alphaDeg: number, n: number): number {
  // D_m = 2 arcsin(n sin(α/2)) − α
  const a = alphaDeg * DEG;
  const arg = n * Math.sin(a / 2);
  if (arg > 1) return NaN;
  return (2 * Math.asin(arg) - a) * RAD;
}

class MinimumDeviationViz {
  private stage: CanvasStage;
  private alpha = 60;
  private n = 1.520;
  private theta1 = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.alpha = hydrateNumber('alpha', 60);
    this.n = hydrateNumber('n', 1.520);
    this.theta1 = hydrateNumber('theta', 50);
    (document.getElementById('alpha') as EncSlider).value = this.alpha;
    (document.getElementById('n') as EncSlider).value = this.n;
    (document.getElementById('theta') as EncSlider).value = this.theta1;
    registerStateParam('alpha', () => this.alpha);
    registerStateParam('n', () => this.n);
    registerStateParam('theta', () => this.theta1);
    for (const id of ['alpha', 'n', 'theta']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'alpha') this.alpha = v;
        else if (id === 'n') this.n = v;
        else this.theta1 = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.alpha = 60; this.n = 1.520; this.theta1 = 50;
      (document.getElementById('alpha') as EncSlider).value = 60;
      (document.getElementById('n') as EncSlider).value = 1.520;
      (document.getElementById('theta') as EncSlider).value = 50;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Left half: ray through prism; Right half: D(θ₁) curve.
    const split = Math.floor(w * 0.5);
    this.drawPrism(ctx, 0, 0, split, h);
    this.drawCurve(ctx, split, 0, w - split, h);
  }

  private drawPrism(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    const cx = x0 + w / 2;
    const cy = y0 + h * 0.55;
    const a = this.alpha * DEG;
    // Equilateral-ish triangle with apex up at angle α.
    const side = Math.min(w, h) * 0.35;
    const base = side;
    const ax = cx;          const ay = cy - side * Math.cos(a / 2);
    const lx = cx - base * Math.sin(a / 2); const ly = cy + side * 0.4;
    const rx = cx + base * Math.sin(a / 2); const ry = cy + side * 0.4;
    ctx.fillStyle = theme.slateAlpha(0.10);
    ctx.strokeStyle = theme.inkAlpha(0.55); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.lineTo(rx, ry); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Incoming ray hits the left face at point P_in.
    const faceLeft = { from: { x: lx, y: ly }, to: { x: ax, y: ay } };
    const faceRight = { from: { x: ax, y: ay }, to: { x: rx, y: ry } };
    const pIn = lerp(faceLeft.from, faceLeft.to, 0.55);
    const t1 = this.theta1 * DEG;

    // Left-face normal: outward normal points down-left.
    const nL = normalize({ x: -(faceLeft.to.y - faceLeft.from.y), y: faceLeft.to.x - faceLeft.from.x });
    // Flip so it points OUT of prism (down-left).
    if (nL.x > 0) { nL.x = -nL.x; nL.y = -nL.y; }
    // Incoming ray direction (toward prism): rotate −nL by +θ₁ in plane.
    const incDir = rotate({ x: -nL.x, y: -nL.y }, t1);
    const incFrom = { x: pIn.x - incDir.x * 120, y: pIn.y - incDir.y * 120 };

    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(incFrom.x, incFrom.y); ctx.lineTo(pIn.x, pIn.y); ctx.stroke();

    // Refract into glass.
    const r1Rad = snellRefract(1, this.n, t1);
    if (r1Rad === null) return;
    // Inside-direction: rotate +nL_inward by +r1 (sign convention same as inc).
    const nLin = { x: -nL.x, y: -nL.y };
    const dirIn = rotate(nLin, r1Rad);

    // Find exit point on right face.
    const exit = lineIntersectSeg(pIn, dirIn, faceRight.from, faceRight.to);
    if (!exit) return;

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(pIn.x, pIn.y); ctx.lineTo(exit.x, exit.y); ctx.stroke();

    // Right-face outward normal.
    const nR = normalize({ x: -(faceRight.to.y - faceRight.from.y), y: faceRight.to.x - faceRight.from.x });
    if (nR.x < 0) { nR.x = -nR.x; nR.y = -nR.y; }
    // Angle inside at exit relative to nR: r2 = α − r1.
    const r2 = this.alpha * DEG - r1Rad;
    const t2 = snellRefract(this.n, 1, r2);
    if (t2 === null) return;
    const dirOut = rotate(nR, t2);
    const outTo = { x: exit.x + dirOut.x * 140, y: exit.y + dirOut.y * 140 };

    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(exit.x, exit.y); ctx.lineTo(outTo.x, outTo.y); ctx.stroke();

    // Labels.
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText(`α = ${this.alpha.toFixed(1)}°`, ax - 22, ay - 8);
  }

  private drawCurve(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
    const pad = 36;
    const plotX = x0 + pad, plotY = y0 + pad;
    const plotW = w - pad * 1.4, plotH = h - pad * 2.2;
    const thetaMin = 20, thetaMax = 85;
    // Compute D-range from current α, n.
    let dMin = +Infinity, dMax = -Infinity;
    const pts: Array<{ t: number; d: number } | null> = [];
    for (let i = 0; i <= 200; i++) {
      const t = thetaMin + (thetaMax - thetaMin) * (i / 200);
      const d = totalDeviation(this.alpha, this.n, t);
      if (d !== null && isFinite(d)) {
        pts.push({ t, d });
        if (d < dMin) dMin = d;
        if (d > dMax) dMax = d;
      } else pts.push(null);
    }
    if (!isFinite(dMin) || !isFinite(dMax)) return;
    const pad_d = (dMax - dMin) * 0.1 + 1;
    dMin -= pad_d; dMax += pad_d;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    const tx = (t: number) => plotX + ((t - thetaMin) / (thetaMax - thetaMin)) * plotW;
    const dy = (d: number) => plotY + (1 - (d - dMin) / (dMax - dMin)) * plotH;

    // Gridlines every 10°.
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 0.5;
    for (let t = 20; t <= 85; t += 10) {
      ctx.beginPath(); ctx.moveTo(tx(t), plotY); ctx.lineTo(tx(t), plotY + plotH); ctx.stroke();
    }

    // D_m horizontal.
    const Dm = minimumDeviation(this.alpha, this.n);
    if (isFinite(Dm)) {
      ctx.strokeStyle = theme.goldAlpha(0.7); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(plotX, dy(Dm)); ctx.lineTo(plotX + plotW, dy(Dm)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.goldDeep;
      ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`D_m = ${Dm.toFixed(2)}°`, plotX + plotW - 90, dy(Dm) - 6);
    }

    // Curve.
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 1.6;
    ctx.beginPath();
    let started = false;
    for (const p of pts) {
      if (p === null) { started = false; continue; }
      const x = tx(p.t), y = dy(p.d);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current point.
    const dCur = totalDeviation(this.alpha, this.n, this.theta1);
    if (dCur !== null && isFinite(dCur)) {
      ctx.fillStyle = theme.crimson;
      ctx.beginPath(); ctx.arc(tx(this.theta1), dy(dCur), 4.5, 0, 2 * Math.PI); ctx.fill();
      ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText(`(θ₁=${this.theta1.toFixed(1)}°, D=${dCur.toFixed(2)}°)`, tx(this.theta1) + 8, dy(dCur) - 6);
    }

    // X-axis labels.
    ctx.fillStyle = axisStyle.label;
    ctx.font = '10px Inter, sans-serif';
    for (let t = 20; t <= 85; t += 15) {
      ctx.fillText(`${t}°`, tx(t) - 8, plotY + plotH + 14);
    }
    ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.inkMute;
    ctx.fillText('θ₁  (entry angle)', plotX + plotW * 0.4, plotY + plotH + 28);
    ctx.save();
    ctx.translate(plotX - 22, plotY + plotH * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('D  (total deviation)', -50, 0);
    ctx.restore();
  }
}

function lerp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function normalize(v: { x: number; y: number }) {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}
function rotate(v: { x: number; y: number }, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
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

window.addEventListener('DOMContentLoaded', () => new MinimumDeviationViz());
