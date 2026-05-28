/*
 * Photoreceptor spectral sensitivities from the Govardovskii (2000) A1 visual-
 * pigment template, generated from each receptor's λ_max.
 * Source: Govardovskii et al., "In search of the visual pigment template",
 * Visual Neuroscience 17 (2000) 509-528.
 *
 * These are normalised pigment absorbance curves (peak ≈ 1). They are the
 * standard teaching shapes for L/M/S cones and rods; true cone *fundamentals*
 * (Stockman-Sharpe) additionally fold in lens and macular filtering.
 */

/** Peak-sensitivity wavelengths (nm). */
export const LAMBDA_MAX = {
  L: 566,   // long-wavelength cone (red)
  M: 543,   // medium-wavelength cone (green)
  S: 441,   // short-wavelength cone (blue)
  rod: 498, // rhodopsin
};

/**
 * Govardovskii A1 template: normalised absorbance at wavelength λ (nm) for a
 * pigment peaking at λmax (nm). Includes the α-band and the secondary β-band.
 */
export function govardovskii(lambda: number, lambdaMax: number): number {
  const x = lambdaMax / lambda;
  const a = 0.8795 + 0.0459 * Math.exp(-((lambdaMax - 300) ** 2) / 11940);
  const A = 69.7, B = 28, C = -14.9, D = 0.674;
  const b = 0.922, c = 1.104;
  const alpha = 1 / (
    Math.exp(A * (a - x)) +
    Math.exp(B * (b - x)) +
    Math.exp(C * (c - x)) +
    D
  );
  // β-band (small secondary peak in the near-UV/blue).
  const lambdaMaxBeta = 189 + 0.315 * lambdaMax;
  const bBeta = -40.5 + 0.195 * lambdaMax;
  const Abeta = 0.26;
  const beta = Abeta * Math.exp(-(((lambda - lambdaMaxBeta) / bBeta) ** 2));
  return alpha + beta;
}

export function lCone(lambda: number): number { return govardovskii(lambda, LAMBDA_MAX.L); }
export function mCone(lambda: number): number { return govardovskii(lambda, LAMBDA_MAX.M); }
export function sCone(lambda: number): number { return govardovskii(lambda, LAMBDA_MAX.S); }
export function rodPigment(lambda: number): number { return govardovskii(lambda, LAMBDA_MAX.rod); }
/** ipRGC / melanopsin sensitivity, λmax ≈ 480 nm. */
export function melanopsin(lambda: number): number { return govardovskii(lambda, 480); }
