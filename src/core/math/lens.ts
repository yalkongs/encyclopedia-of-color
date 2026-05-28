/*
 * Gaussian (thin- and thick-lens) imaging helpers.
 * Convention: distances measured from the lens; object distance s_o > 0 in front,
 * real image distance s_i > 0 behind. 1/s_o + 1/s_i = 1/f. Hecht §5.2.
 */

export interface ImageResult {
  imageDist: number;     // s_i (signed: + real/behind, − virtual/front)
  magnification: number; // m = −s_i/s_o
  real: boolean;
}

/** Thin-lens imaging from object distance s_o and focal length f. */
export function thinLensImage(objectDist: number, f: number): ImageResult {
  const inv = 1 / f - 1 / objectDist;
  if (Math.abs(inv) < 1e-12) {
    return { imageDist: Infinity, magnification: -Infinity, real: false };
  }
  const si = 1 / inv;
  return { imageDist: si, magnification: -si / objectDist, real: si > 0 };
}

/**
 * Lensmaker's equation for a thin lens in air:
 *   1/f = (n − 1)·(1/R₁ − 1/R₂)
 * R sign convention: positive if the surface's centre of curvature is on the
 * outgoing (right) side. Returns focal length f.
 */
export function lensmakerFocal(n: number, R1: number, R2: number): number {
  const power = (n - 1) * (1 / R1 - 1 / R2);
  return 1 / power;
}

/** Newton's form of the lens equation: x·x' = f² (x measured from focal points). */
export function newtonImage(xObjectFromFocus: number, f: number): number {
  return (f * f) / xObjectFromFocus;
}
