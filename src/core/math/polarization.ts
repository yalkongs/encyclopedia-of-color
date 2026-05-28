/*
 * Jones calculus + Stokes parameters for polarization optics.
 * Source: Hecht, Optics 5e §8.13; Goldstein, Polarized Light 3e.
 */

export interface Complex { re: number; im: number }
export type Jones = [Complex, Complex];      // [Ex, Ey]
export type Mat2 = [[Complex, Complex], [Complex, Complex]];

export const c = (re: number, im = 0): Complex => ({ re, im });
export const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cabs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const cexp = (theta: number): Complex => ({ re: Math.cos(theta), im: Math.sin(theta) });

/** Linear polarization at angle θ (rad) from the x-axis, unit amplitude. */
export function jonesLinear(theta: number): Jones {
  return [c(Math.cos(theta)), c(Math.sin(theta))];
}

/** Build a Jones vector from x/y amplitudes and the y-phase lead δ (rad). */
export function jonesFromAmpPhase(ax: number, ay: number, delta: number): Jones {
  return [c(ax), cmul(c(ay), cexp(delta))];
}

/** Ideal linear polarizer transmitting at angle θ. */
export function polarizerMatrix(theta: number): Mat2 {
  const ct = Math.cos(theta), st = Math.sin(theta);
  return [
    [c(ct * ct), c(ct * st)],
    [c(ct * st), c(st * st)],
  ];
}

/** Retarder (wave plate): phase retardation Γ, fast axis at angle θ. */
export function retarderMatrix(gamma: number, theta: number): Mat2 {
  const ct = Math.cos(theta), st = Math.sin(theta);
  const eF = cexp(-gamma / 2);  // fast axis
  const eS = cexp(+gamma / 2);  // slow axis
  // R(-θ) · diag(eF, eS) · R(θ)
  const m00 = cadd(cmul(c(ct * ct), eF), cmul(c(st * st), eS));
  const m01 = cadd(cmul(c(ct * st), eF), cmul(c(-ct * st), eS));
  const m10 = m01;
  const m11 = cadd(cmul(c(st * st), eF), cmul(c(ct * ct), eS));
  return [[m00, m01], [m10, m11]];
}

/** Optical rotator: rotates the polarization plane by angle β. */
export function rotatorMatrix(beta: number): Mat2 {
  const cb = Math.cos(beta), sb = Math.sin(beta);
  return [
    [c(cb), c(-sb)],
    [c(sb), c(cb)],
  ];
}

/** Apply a Jones matrix to a Jones vector. */
export function applyMat(M: Mat2, v: Jones): Jones {
  return [
    cadd(cmul(M[0][0], v[0]), cmul(M[0][1], v[1])),
    cadd(cmul(M[1][0], v[0]), cmul(M[1][1], v[1])),
  ];
}

export interface Stokes { S0: number; S1: number; S2: number; S3: number }

/** Stokes parameters from a Jones vector. */
export function stokes(v: Jones): Stokes {
  const [Ex, Ey] = v;
  const Ix = cabs2(Ex), Iy = cabs2(Ey);
  // ExEy* = Ex · conj(Ey)
  const exeyRe = Ex.re * Ey.re + Ex.im * Ey.im;
  const exeyIm = Ex.im * Ey.re - Ex.re * Ey.im;
  return {
    S0: Ix + Iy,
    S1: Ix - Iy,
    S2: 2 * exeyRe,
    S3: 2 * exeyIm,
  };
}

/** Degree of polarization assuming a pure state ⇒ 1; here returns |S|/S0. */
export function degreeOfPolarization(s: Stokes): number {
  if (s.S0 <= 0) return 0;
  return Math.sqrt(s.S1 * s.S1 + s.S2 * s.S2 + s.S3 * s.S3) / s.S0;
}

export interface EllipseParams { psi: number; chi: number; ax: number; ay: number }

/**
 * Polarization-ellipse orientation ψ and ellipticity χ from Stokes parameters.
 *   ψ = ½·atan2(S2, S1)   (−π/2 … π/2)
 *   χ = ½·asin(S3 / S0)   (−π/4 … π/4)
 * ax, ay are the ellipse semi-axes (normalised so the larger ≈ 1).
 */
export function ellipseParams(s: Stokes): EllipseParams {
  const psi = 0.5 * Math.atan2(s.S2, s.S1);
  const chi = 0.5 * Math.asin(Math.max(-1, Math.min(1, s.S3 / (s.S0 || 1))));
  const a = Math.cos(chi);
  const b = Math.sin(chi);
  return { psi, chi, ax: a, ay: Math.abs(b) };
}

/** Normalised Poincaré-sphere coordinates (unit sphere) from Stokes. */
export function poincare(s: Stokes): { x: number; y: number; z: number } {
  const n = s.S0 || 1;
  return { x: s.S1 / n, y: s.S2 / n, z: s.S3 / n };
}
