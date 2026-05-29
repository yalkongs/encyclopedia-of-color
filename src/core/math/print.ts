/*
 * Print-reproduction maths: RGB↔CMYK separation and halftone tone-value models.
 *
 * Murray-Davies and Yule-Nielsen both recover the fractional dot area from the
 * measured reflectance of a tint, relative to paper (R_p) and solid (R_s):
 *   Murray-Davies (no optical gain):  a = (1 − R_t/R_p) / (1 − R_s/R_p)
 *   Yule-Nielsen (n accounts for light scatter in paper):
 *                                     a = (1 − (R_t/R_p)^{1/n}) / (1 − (R_s/R_p)^{1/n})
 * Yule-Nielsen at n = 1 is identical to Murray-Davies.
 *
 * Sources: Field, Color and Its Reproduction §5–6; Yule & Nielsen (1951).
 */

export interface CMYK { c: number; m: number; y: number; k: number; }

/** Naive GCR separation of sRGB-ish RGB (0..1) to CMYK (0..1). Production prepress uses tuned curves. */
export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const c0 = 1 - r, m0 = 1 - g, y0 = 1 - b;
  const k = Math.min(c0, m0, y0);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 1 };
  return { c: (c0 - k) / (1 - k), m: (m0 - k) / (1 - k), y: (y0 - k) / (1 - k), k };
}

/** Recombine CMYK (0..1) to an approximate sRGB-ish RGB (0..1) for on-screen preview. */
export function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  return [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)];
}

/** Murray-Davies effective dot area from relative reflectances (Rp = paper, Rs = solid). */
export function murrayDaviesArea(Rt: number, Rp: number, Rs: number): number {
  return (1 - Rt / Rp) / (1 - Rs / Rp);
}

/** Yule-Nielsen effective dot area with n-factor (n = 1 reduces to Murray-Davies). */
export function yuleNielsenArea(Rt: number, Rp: number, Rs: number, n: number): number {
  return (1 - Math.pow(Rt / Rp, 1 / n)) / (1 - Math.pow(Rs / Rp, 1 / n));
}

/** Forward Yule-Nielsen: reflectance of a tint of mechanical area `a` at n-factor `n`. */
export function yuleNielsenReflectance(a: number, Rp: number, Rs: number, n: number): number {
  return Rp * Math.pow(1 - a * (1 - Math.pow(Rs / Rp, 1 / n)), n);
}
