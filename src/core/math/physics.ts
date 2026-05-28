/*
 * Geometric and wave optics helpers.
 * Source: Hecht, Optics 5e (Ch. 4, 8, 9).
 */

/**
 * Snell's Law refracted angle. Returns null if past the critical angle (TIR).
 * Inputs in radians.
 */
export function snellRefract(
  n1: number,
  n2: number,
  theta1Rad: number,
): number | null {
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  if (Math.abs(sinTheta2) > 1) return null;
  return Math.asin(sinTheta2);
}

/**
 * Critical angle from a denser medium (n1 > n2). Returns null if no TIR possible.
 * Output in radians.
 */
export function criticalAngle(n1: number, n2: number): number | null {
  if (n2 >= n1) return null;
  return Math.asin(n2 / n1);
}

/**
 * Fresnel reflectance for unpolarized light at a single interface (s/p averaged).
 * Hecht §4.6.2.
 */
export function fresnelUnpolarized(
  n1: number,
  n2: number,
  theta1Rad: number,
): number {
  const cos1 = Math.cos(theta1Rad);
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  if (Math.abs(sinTheta2) > 1) return 1; // TIR
  const cos2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
  const rs = (n1 * cos1 - n2 * cos2) / (n1 * cos1 + n2 * cos2);
  const rp = (n2 * cos1 - n1 * cos2) / (n2 * cos1 + n1 * cos2);
  return 0.5 * (rs * rs + rp * rp);
}

/**
 * Thin-film interference reflectance for a single dielectric layer in air.
 * For each wavelength λ (nm), film thickness d (nm), and refractive index n,
 * returns the relative reflected intensity (0..1).
 *
 * Constructive: 2·n·d·cos(θ_film) = (m + 1/2)·λ  (with π phase shift at top interface)
 * Hecht §9.6.
 */
export function thinFilmReflectance(
  lambdaNm: number,
  filmThicknessNm: number,
  filmN: number,
  incidenceRad = 0,
): number {
  const sinT = Math.sin(incidenceRad) / filmN;
  const cosT = Math.sqrt(1 - sinT * sinT);
  const phase = (4 * Math.PI * filmN * filmThicknessNm * cosT) / lambdaNm;
  // π phase shift at air→film interface (n increases), no shift at film→air.
  // Reflected intensity: I_r ∝ sin²(phase/2).
  const s = Math.sin(phase / 2);
  return s * s;
}

/**
 * Rayleigh scattering coefficient (proportional to 1/λ⁴).
 * Returns a relative scattering intensity; absolute scale is unit-arbitrary.
 * Hecht §8.5.2.
 */
export function rayleighIntensity(lambdaNm: number): number {
  const ref = 550; // normalize at green
  return Math.pow(ref / lambdaNm, 4);
}

/**
 * Cauchy dispersion: n(λ) = B + C/λ².
 * Defaults match BK7 crown glass approximations.
 */
export function cauchyN(lambdaNm: number, B = 1.5046, C = 4200): number {
  return B + C / (lambdaNm * lambdaNm);
}

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/**
 * Evanescent-wave penetration depth at total internal reflection.
 * Returns d_p in the same length units as λ, where the field amplitude falls
 * to 1/e. Returns null if not in TIR regime (θ ≤ θ_c).
 *
 * Hecht §4.7.2:  d_p = λ / (2π · sqrt(n₁²sin²θ − n₂²))
 */
export function evanescentDecayDepth(
  lambda: number,
  n1: number,
  n2: number,
  thetaRad: number,
): number | null {
  const arg = (n1 * Math.sin(thetaRad)) ** 2 - n2 * n2;
  if (arg <= 0) return null;
  return lambda / (2 * Math.PI * Math.sqrt(arg));
}

/**
 * Frustrated-TIR transmission: when a second medium of higher index lies
 * within an evanescent decay length of the TIR surface, some fraction of the
 * field tunnels across the gap. This is the optical analogue of quantum
 * tunnelling. Returns approximate transmittance ∈ [0, 1].
 *
 * Hecht §4.7.3 (qualitative approximation: T ≈ exp(−2 d / d_p)).
 */
export function frustratedTIR(
  gap: number,
  decayDepth: number,
): number {
  if (decayDepth <= 0) return 0;
  return Math.exp(-2 * gap / decayDepth);
}
