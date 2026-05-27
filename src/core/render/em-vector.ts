/*
 * Pseudo-3D vector visualisation on a 2D canvas.
 *
 * Used by the em-fundamentals modules (E·B vectors, Poynting flux, etc.)
 * and any other module that needs to draw arrows or axes in 3-space without
 * the cost of a full WebGL pipeline.
 *
 * Projection: standard right-handed coordinate system, isometric-ish:
 *   +x  →  to the right                    (direction of propagation)
 *   +y  →  up
 *   +z  →  out of the page (towards viewer) — appears as down-right offset
 *
 * The projection matrix is intentionally fixed: every module renders in the
 * same orientation so users build a consistent mental model.
 */

import { theme } from './theme';

export interface Point2D { x: number; y: number }
export interface Vec3D { x: number; y: number; z: number }

const PROJ = {
  // Screen offset per world unit
  axisX: { px: 1.0, py: 0.0 },   // x → right
  axisY: { px: 0.0, py: -1.0 },  // y → up (canvas y inverted)
  axisZ: { px: -0.55, py: -0.32 },// z → up-left (gives "out of page" feel)
};

export function project3D(v: Vec3D, scale = 1): Point2D {
  return {
    x: (v.x * PROJ.axisX.px + v.y * PROJ.axisY.px + v.z * PROJ.axisZ.px) * scale,
    y: (v.x * PROJ.axisX.py + v.y * PROJ.axisY.py + v.z * PROJ.axisZ.py) * scale,
  };
}

export function projectFrom(origin: Point2D, v: Vec3D, scale = 1): Point2D {
  const p = project3D(v, scale);
  return { x: origin.x + p.x, y: origin.y + p.y };
}

/**
 * Draw a 3D arrow from origin in direction v (in world units).
 */
export function drawArrow3D(
  ctx: CanvasRenderingContext2D,
  origin: Point2D,
  v: Vec3D,
  scale: number,
  color: string,
  width = 2,
  label?: string,
): void {
  const tip = projectFrom(origin, v, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  // Arrowhead — small triangle
  const dx = tip.x - origin.x, dy = tip.y - origin.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ang = Math.atan2(dy, dx);
  const head = Math.max(6, width * 3);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - head * Math.cos(ang - 0.35), tip.y - head * Math.sin(ang - 0.35));
  ctx.lineTo(tip.x - head * Math.cos(ang + 0.35), tip.y - head * Math.sin(ang + 0.35));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(label, tip.x + 6, tip.y - 4);
  }
}

/**
 * Draw the x/y/z axis triad centred at `origin` with the given world-length.
 */
export function drawAxisTriad(
  ctx: CanvasRenderingContext2D,
  origin: Point2D,
  length: number,
  options: { xColor?: string; yColor?: string; zColor?: string; alpha?: number } = {},
): void {
  const a = options.alpha ?? 0.55;
  const xColor = options.xColor ?? theme.inkAlpha(a);
  const yColor = options.yColor ?? theme.inkAlpha(a);
  const zColor = options.zColor ?? theme.inkAlpha(a);
  drawArrow3D(ctx, origin, { x: length, y: 0, z: 0 }, 1, xColor, 1.2, 'x');
  drawArrow3D(ctx, origin, { x: 0, y: length, z: 0 }, 1, yColor, 1.2, 'y');
  drawArrow3D(ctx, origin, { x: 0, y: 0, z: length }, 1, zColor, 1.2, 'z');
}

/**
 * Cross product — handy for Poynting/right-hand-rule visualisations.
 */
export function cross3(a: Vec3D, b: Vec3D): Vec3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function magnitude3(v: Vec3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Draw a faint reference plane (e.g. the xz-plane the EM wave propagates along).
 */
export function drawReferencePlane(
  ctx: CanvasRenderingContext2D,
  origin: Point2D,
  axisU: Vec3D,
  axisV: Vec3D,
  scale: number,
  uSpan: number,
  vSpan: number,
  color: string,
  steps = 8,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 - 1;   // -1..+1
    // Line along axisV at offset t·axisU
    const u = { x: axisU.x * t * uSpan, y: axisU.y * t * uSpan, z: axisU.z * t * uSpan };
    const start = projectFrom(origin, { x: u.x - axisV.x * vSpan, y: u.y - axisV.y * vSpan, z: u.z - axisV.z * vSpan }, scale);
    const end   = projectFrom(origin, { x: u.x + axisV.x * vSpan, y: u.y + axisV.y * vSpan, z: u.z + axisV.z * vSpan }, scale);
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  }
}
