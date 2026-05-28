/*
 * Light-scattering helpers: Rayleigh and Mie regimes.
 * Sources: van de Hulst, Light Scattering by Small Particles (1957);
 *          Bohren & Huffman, Absorption and Scattering of Light by Small Particles (1983).
 */

/** Size parameter x = 2πr/λ (r and λ in the same units). */
export function sizeParameter(radiusNm: number, lambdaNm: number): number {
  return (2 * Math.PI * radiusNm) / lambdaNm;
}

/**
 * Extinction efficiency Q_ext of a transparent sphere via van de Hulst's
 * anomalous-diffraction approximation (ADT). Valid for x ≳ 1 and (m−1) small.
 *   ρ = 2x(m−1)
 *   Q_ext = 2 − (4/ρ)·sinρ + (4/ρ²)·(1 − cosρ)
 * Approaches 2 (the extinction paradox) for large droplets, weakly oscillating
 * and nearly wavelength-independent ⇒ clouds look white.
 */
export function mieQextADT(x: number, m = 1.33): number {
  const rho = 2 * x * (m - 1);
  if (Math.abs(rho) < 1e-6) return 0;
  return 2 - (4 / rho) * Math.sin(rho) + (4 / (rho * rho)) * (1 - Math.cos(rho));
}

/**
 * Rayleigh scattering efficiency (x ≪ 1):
 *   Q_sca = (8/3) x⁴ |(m²−1)/(m²+2)|²   ∝ x⁴ ∝ λ⁻⁴.
 */
export function rayleighQsca(x: number, m = 1.33): number {
  const f = (m * m - 1) / (m * m + 2);
  return (8 / 3) * Math.pow(x, 4) * f * f;
}

/**
 * Scattering-asymmetry parameter g = ⟨cosθ⟩, modelled as a smooth rise from
 * 0 (Rayleigh, symmetric) toward ~0.87 (large droplets, strongly forward).
 * Empirical interpolation for visualisation, not a Mie computation.
 */
export function asymmetryG(x: number): number {
  const gMax = 0.87;
  return gMax * (1 - Math.exp(-x / 3));
}

/**
 * Henyey-Greenstein phase function p(cosθ) for asymmetry g.
 * Normalised so ∫ p dΩ = 1. Forward-peaked for g → 1, isotropic at g = 0.
 */
export function henyeyGreenstein(cosTheta: number, g: number): number {
  const denom = Math.pow(1 + g * g - 2 * g * cosTheta, 1.5);
  return (1 - g * g) / (4 * Math.PI * denom);
}
