/*
 * Subsample-anti-aliased region fill for colour-solid slices.
 *
 * The colour region is point-sampled on an integer cell grid. Each cell takes
 * `sub × sub` subsamples; the fraction inside the region becomes the cell's
 * alpha (coverage), so the boundary fades smoothly into the background instead
 * of stepping in hard `cell`-sized blocks. Interior cells (coverage 1) tile
 * opaquely edge-to-edge; only the boundary ring is semi-transparent and is
 * painted once over the background, so there is no double-blending.
 */

type RGB = [number, number, number];

export interface RegionAAOptions {
  /** Fill-cell size in CSS px (smaller = finer edge, more cost). Default 2. */
  cell?: number;
  /** Subsamples per axis per cell (more = smoother alpha ramp). Default 4. */
  sub?: number;
}

/**
 * Fill the axis-aligned screen rectangle [x0,x1)×[y0,y1) with the region that
 * `sample` defines. `sample(x, y)` returns the 0..255 RGB colour at a screen
 * point inside the region, or `null` outside it.
 */
export function fillRegionAA(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sample: (x: number, y: number) => RGB | null,
  { cell = 2, sub = 4 }: RegionAAOptions = {},
): void {
  const ix0 = Math.floor(x0);
  const iy0 = Math.floor(y0);
  const ix1 = Math.ceil(x1);
  const iy1 = Math.ceil(y1);
  const total = sub * sub;
  const inv = cell / sub;
  for (let py = iy0; py < iy1; py += cell) {
    for (let px = ix0; px < ix1; px += cell) {
      let n = 0, r = 0, g = 0, b = 0;
      for (let j = 0; j < sub; j++) {
        for (let i = 0; i < sub; i++) {
          const c = sample(px + (i + 0.5) * inv, py + (j + 0.5) * inv);
          if (c) { n++; r += c[0]; g += c[1]; b += c[2]; }
        }
      }
      if (n === 0) continue;
      const cov = n / total;
      ctx.fillStyle = `rgba(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)},${cov.toFixed(3)})`;
      ctx.fillRect(px, py, cell, cell);
    }
  }
}
