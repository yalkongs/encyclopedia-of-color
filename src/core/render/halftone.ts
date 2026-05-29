/*
 * Halftone screening primitives for the print domain.
 *
 * AM (amplitude modulation): a regular grid of dots whose *size* tracks tone.
 *   Dot radius for fractional coverage c in a cell of side s is r = s·√(c/π)
 *   (so c = π/4 ≈ 0.785 is the inscribed dot, r = s/2). Above that the cell
 *   is mostly solid with a shrinking light hole.
 * FM (frequency modulation): fixed micro-dots whose *count/placement* tracks
 *   tone, via an ordered (Bayer) or stochastic threshold.
 *
 * Plates are drawn in their ink colour; stack them with
 * `ctx.globalCompositeOperation = 'multiply'` over white paper to get the
 * subtractive mix (cyan×magenta = blue, etc.) — never normal alpha blend.
 *
 * Source: Kipphan, Handbook of Print Media, §1.3.
 */

/** AM dot radius for coverage c (0..1) in a cell of side `cell`. Valid for c ≤ π/4. */
export function amDotRadius(c: number, cell: number): number {
  return cell * Math.sqrt(Math.max(0, Math.min(c, Math.PI / 4)) / Math.PI);
}

export interface ClusteredScreenOpts {
  /** Background/paper colour used to punch the light hole in shadow tones (c > π/4). Omit when multiply-stacking plates. */
  bg?: string;
}

const INSCRIBED = Math.PI / 4;

/**
 * Draw an AM clustered-dot halftone of `coverage(x,y)` (0 = no ink … 1 = solid)
 * onto `ctx`, on a dot grid of pitch `cell` rotated by `angleDeg`, filled in `ink`.
 */
export function clusteredScreen(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  cell: number, angleDeg: number, ink: string,
  coverage: (x: number, y: number) => number,
  opts: ClusteredScreenOpts = {},
): void {
  const a = (angleDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2;
  const ux = ca * cell, uy = sa * cell, vx = -sa * cell, vy = ca * cell;
  const N = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / cell) + 2;
  ctx.save();
  for (let j = -N; j <= N; j++) {
    for (let i = -N; i <= N; i++) {
      const px = cxm + i * ux + j * vx;
      const py = cym + i * uy + j * vy;
      if (px < x0 - cell || px > x1 + cell || py < y0 - cell || py > y1 + cell) continue;
      const c = Math.max(0, Math.min(1, coverage(px, py)));
      if (c <= 0) continue;
      if (c <= INSCRIBED) {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(px, py, cell * Math.sqrt(c / Math.PI), 0, Math.PI * 2); ctx.fill();
      } else if (opts.bg && c < 1) {
        // shadow: solid rotated cell with a shrinking light hole
        ctx.save(); ctx.translate(px, py); ctx.rotate(a);
        ctx.fillStyle = ink; ctx.fillRect(-cell / 2, -cell / 2, cell + 0.5, cell + 0.5);
        ctx.fillStyle = opts.bg;
        ctx.beginPath(); ctx.arc(0, 0, cell * Math.sqrt((1 - c) / Math.PI), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        // no paper colour to punch with → let dots merge toward solid
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(px, py, cell * Math.sqrt(c / Math.PI), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Recursive Bayer ordered-dither matrix of side `n` (power of two), values in (0,1). */
export function bayerMatrix(n: number): number[][] {
  let m = [[0]];
  let size = 1;
  while (size < n) {
    const ns = size * 2;
    const nm: number[][] = Array.from({ length: ns }, () => new Array(ns).fill(0));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = m[y][x] * 4;
        nm[y][x] = v; nm[y][x + size] = v + 2; nm[y + size][x] = v + 3; nm[y + size][x + size] = v + 1;
      }
    }
    m = nm; size = ns;
  }
  const denom = n * n;
  return m.map((row) => row.map((v) => (v + 0.5) / denom));
}

/** Deterministic per-pixel pseudo-random value in [0,1) for stochastic (random) screening. */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
