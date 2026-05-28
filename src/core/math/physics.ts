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

/**
 * Sellmeier dispersion (1st-order, three-term):
 *   n²(λ) = 1 + Σᵢ Bᵢ · λ² / (λ² − Cᵢ),  with λ in micrometres.
 * Hecht §3.5.1; Schott / Malitson coefficients.
 */
export function sellmeierN(
  lambdaNm: number,
  B: [number, number, number],
  C: [number, number, number],
): number {
  const lUm = lambdaNm / 1000;
  const l2 = lUm * lUm;
  const n2 =
    1 +
    (B[0] * l2) / (l2 - C[0]) +
    (B[1] * l2) / (l2 - C[1]) +
    (B[2] * l2) / (l2 - C[2]);
  return Math.sqrt(Math.max(0, n2));
}

/** Standard Sellmeier coefficient bundles (λ in µm). */
export const SELLMEIER = {
  BK7: {
    B: [1.03961212, 0.231792344, 1.01046945] as [number, number, number],
    C: [0.00600069867, 0.0200179144, 103.560653] as [number, number, number],
  },
  FUSED_SILICA: {
    B: [0.6961663, 0.4079426, 0.8974794] as [number, number, number],
    C: [0.004679148, 0.01351206, 97.93434] as [number, number, number],
  },
  SF11: {
    B: [1.73759695, 0.313747346, 1.89878101] as [number, number, number],
    C: [0.013188707, 0.0623068142, 155.23629] as [number, number, number],
  },
};

/**
 * Abbe number V_d = (n_d − 1) / (n_F − n_C), the standard inverse-dispersion
 * figure of merit for an optical glass.
 *   - d-line: 587.6 nm (helium)
 *   - F-line: 486.1 nm (hydrogen)
 *   - C-line: 656.3 nm (hydrogen)
 * Crown glasses sit near V ≈ 60; flint glasses near V ≈ 25-35.
 */
export function abbeNumber(
  nFn: (lambdaNm: number) => number,
): number {
  const nd = nFn(587.6);
  const nF = nFn(486.1);
  const nC = nFn(656.3);
  return (nd - 1) / (nF - nC);
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
 * Fabry-Perot Airy transmittance for a lossless cavity of two mirrors with
 * (intensity) reflectance R. δ is the round-trip phase: δ = 4π n d cosθ / λ.
 *   T(δ) = 1 / (1 + F·sin²(δ/2)),   F = 4R/(1−R)²  (coefficient of finesse)
 * Hecht §9.6.1.
 */
export function airyTransmittance(deltaRad: number, R: number): number {
  const F = coefficientOfFinesse(R);
  const s = Math.sin(deltaRad / 2);
  return 1 / (1 + F * s * s);
}

/** Coefficient of finesse F = 4R/(1−R)². */
export function coefficientOfFinesse(R: number): number {
  const d = 1 - R;
  return (4 * R) / (d * d);
}

/** Reflective finesse 𝓕 = π√R/(1−R): ratio of FSR to fringe FWHM. */
export function reflectiveFinesse(R: number): number {
  return (Math.PI * Math.sqrt(R)) / (1 - R);
}

/**
 * General single-layer reflectance for a film of index n1, thickness d (nm),
 * between media n0 (incidence) and n2 (substrate), at wavelength λ (nm).
 * Uses the complex amplitude recursion at near-normal incidence:
 *   r = (r01 + r12 e^{−2iβ}) / (1 + r01 r12 e^{−2iβ}),  β = 2π n1 d / λ
 * Returns reflectance R = |r|² ∈ [0,1]. Hecht §9.7 (AR coatings).
 */
export function thinFilmReflectanceGeneral(
  lambdaNm: number,
  filmThicknessNm: number,
  n0: number,
  n1: number,
  n2: number,
): number {
  const r01 = (n0 - n1) / (n0 + n1);
  const r12 = (n1 - n2) / (n1 + n2);
  const beta = (2 * Math.PI * n1 * filmThicknessNm) / lambdaNm;
  const cos2b = Math.cos(2 * beta);
  const sin2b = Math.sin(2 * beta);
  // Numerator   r01 + r12·e^{−2iβ}
  const numRe = r01 + r12 * cos2b;
  const numIm = -r12 * sin2b;
  // Denominator 1 + r01·r12·e^{−2iβ}
  const denRe = 1 + r01 * r12 * cos2b;
  const denIm = -r01 * r12 * sin2b;
  const numMag2 = numRe * numRe + numIm * numIm;
  const denMag2 = denRe * denRe + denIm * denIm;
  return numMag2 / denMag2;
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
