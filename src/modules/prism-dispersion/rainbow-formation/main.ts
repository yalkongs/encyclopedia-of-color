import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG, RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Cauchy-style dispersion for liquid water (rough fit).
function nWater(lambdaNm: number): number {
  return 1.324 + 3300 / (lambdaNm * lambdaNm);
}

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

/** Compute primary-rainbow exit ray for a given impact ratio b/R and refractive index n.
 *  Returns the deviation D (rad) and a polyline of {x,y} points in unit-drop coordinates
 *  (drop centred at origin, radius 1, incoming ray travelling +x direction with y = -b/R).
 *  Returns null if refraction fails.
 */
function rainbowPath(bRatio: number, n: number) {
  const alpha = Math.asin(bRatio);
  const sinR = bRatio / n;
  if (Math.abs(sinR) > 1) return null;
  const r = Math.asin(sinR);

  // P1: entry on left side of drop.
  const P1 = { x: -Math.cos(alpha), y: -Math.sin(alpha) };
  // Inside angle relative to +x: between 0 and α (refracted ray bends toward inward normal).
  const insideAng1 = alpha - r;
  const v1 = { x: Math.cos(insideAng1), y: Math.sin(insideAng1) };

  // P2: opposite side of drop along chord.  t = -2 (P1·v).
  const t1 = -2 * (P1.x * v1.x + P1.y * v1.y);
  const P2 = { x: P1.x + t1 * v1.x, y: P1.y + t1 * v1.y };

  // Reflect inside off back wall.
  const n2 = { x: P2.x, y: P2.y };  // outward normal at P2.
  const dot1 = v1.x * n2.x + v1.y * n2.y;
  const v2 = { x: v1.x - 2 * dot1 * n2.x, y: v1.y - 2 * dot1 * n2.y };

  // P3: next intersection.
  const t2 = -2 * (P2.x * v2.x + P2.y * v2.y);
  const P3 = { x: P2.x + t2 * v2.x, y: P2.y + t2 * v2.y };

  // Refract OUT at P3 (n → 1).
  const n3 = { x: P3.x, y: P3.y };  // outward normal.
  const cosI3 = v2.x * n3.x + v2.y * n3.y;  // positive if exiting outward.
  if (cosI3 <= 0) return null;
  const sinI3 = Math.sqrt(Math.max(0, 1 - cosI3 * cosI3));
  const sinT3 = n * sinI3;
  if (sinT3 > 1) return null;  // would TIR, no exit.
  const cosT3 = Math.sqrt(1 - sinT3 * sinT3);
  // Standard refraction vector form (entering medium with index 1):
  // t = (n1/n2)*v + (n1/n2 * cosI − cosT) * n̂   (n̂ = outward normal of incident medium = same as n3)
  const mu = n;  // n1/n2 = n/1
  const v3 = {
    x: mu * v2.x + (mu * cosI3 - cosT3) * n3.x,
    y: mu * v2.y + (mu * cosI3 - cosT3) * n3.y,
  };
  const len = Math.hypot(v3.x, v3.y) || 1;
  v3.x /= len; v3.y /= len;

  // Deviation: angle between incoming (+x) and outgoing v3.
  const dev = Math.atan2(v3.y, v3.x);   // signed.

  // Closed-form check: D = π + 2i − 4r  (rotated by sign).
  // We return polyline + deviation.
  const exitFar = { x: P3.x + 2.5 * v3.x, y: P3.y + 2.5 * v3.y };
  const incomingFar = { x: P1.x - 2.0, y: P1.y };
  return { path: [incomingFar, P1, P2, P3, exitFar], dev };
}

class RainbowViz {
  private stage: CanvasStage;
  private bRatio = 0.86;
  private lambda = 589;
  private full = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bRatio = hydrateNumber('b', 0.86);
    this.lambda = hydrateNumber('lambda', 589);
    this.full = hydrateNumber('full', 1);
    (document.getElementById('b') as EncSlider).value = this.bRatio;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('full') as EncSlider).value = this.full;
    registerStateParam('b', () => this.bRatio);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('full', () => this.full);
    for (const id of ['b', 'lambda', 'full']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'b') this.bRatio = v;
        else if (id === 'lambda') this.lambda = v;
        else this.full = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.bRatio = 0.86; this.lambda = 589; this.full = 1;
      (document.getElementById('b') as EncSlider).value = 0.86;
      (document.getElementById('lambda') as EncSlider).value = 589;
      (document.getElementById('full') as EncSlider).value = 1;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    // Drop in unit coords. Map to canvas with centre + scale.
    const cx = w * 0.45, cy = h * 0.55;
    const R = Math.min(w, h) * 0.30;
    const toX = (u: number) => cx + u * R;
    const toY = (v: number) => cy + v * R;  // note: canvas y-down; b/R positive ⇒ ray above centre ⇒ y < cy ⇒ -v.

    // Drop.
    ctx.fillStyle = 'rgba(120, 170, 220, 0.10)';
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // 42° rainbow caustic circle in red (around antisolar = leftward of centre, on the screen-left).
    // Antisolar direction = -x.  Rainbow angle θ_R from antisolar ⇒ rays exit from drop with
    // outgoing direction = (-cos θ_R, ±sin θ_R) roughly.  For visualisation, draw a dashed
    // gold arc centred at drop centre with radius R, sweeping the exit-direction wedge.
    ctx.setLineDash([4, 4]); ctx.strokeStyle = theme.goldAlpha(0.5); ctx.lineWidth = 1;
    ctx.beginPath();
    // arc from angle (180 − 42) = 138° to (180 + 42) = 222° around the drop, just visually.
    ctx.arc(cx, cy, R * 1.6, (180 - 42) * DEG, (180 + 42) * DEG);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('rainbow caustic ~42°', toX(-1.6) - 90, toY(0) + 4);

    // Full-spectrum rays.
    if (this.full === 1) {
      const samples = 14;
      for (let i = 0; i < samples; i++) {
        const lam = 400 + (700 - 400) * (i / (samples - 1));
        const n = nWater(lam);
        const path = rainbowPath(this.bRatio, n);
        if (!path) continue;
        ctx.strokeStyle = lambdaToColor(lam);
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let k = 0; k < path.path.length; k++) {
          const p = path.path[k];
          if (k === 0) ctx.moveTo(toX(p.x), toY(-p.y));
          else ctx.lineTo(toX(p.x), toY(-p.y));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Highlighted single-wavelength ray.
    const nCur = nWater(this.lambda);
    const cur = rainbowPath(this.bRatio, nCur);
    if (cur) {
      ctx.strokeStyle = lambdaToColor(this.lambda);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let k = 0; k < cur.path.length; k++) {
        const p = cur.path[k];
        if (k === 0) ctx.moveTo(toX(p.x), toY(-p.y));
        else ctx.lineTo(toX(p.x), toY(-p.y));
      }
      ctx.stroke();

      // Mark the three interaction points.
      ctx.fillStyle = theme.ink;
      for (let k = 1; k <= 3; k++) {
        const p = cur.path[k];
        ctx.beginPath(); ctx.arc(toX(p.x), toY(-p.y), 3, 0, 2 * Math.PI); ctx.fill();
      }
    }

    // Readouts.
    const alpha = Math.asin(this.bRatio) * RAD;
    const r = Math.asin(this.bRatio / nCur) * RAD;
    const D_deg = 180 + 2 * alpha - 4 * r;
    const rainbowDeg = 180 - D_deg;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`n(λ=${this.lambda} nm) = ${nCur.toFixed(4)}`, 16, 30);
    ctx.fillText(`i = ${alpha.toFixed(2)}°    r = ${r.toFixed(2)}°`, 16, 52);
    ctx.fillText(`D = ${D_deg.toFixed(2)}°    rainbow angle = ${rainbowDeg.toFixed(2)}°`, 16, 74);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Descartes 1637 / Newton 1666: caustic minimum near b/R = 0.86 for water.`, 16, 96);
  }
}
window.addEventListener('DOMContentLoaded', () => new RainbowViz());
