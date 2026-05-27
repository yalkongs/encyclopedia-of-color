/*
 * Standard illuminant white points (normalized so Y=1.0).
 * Source: CIE 015:2018, Table 11.6.
 */

export interface WhitePoint {
  X: number;
  Y: number;
  Z: number;
}

export const D65: WhitePoint = { X: 0.95047, Y: 1.0, Z: 1.08883 };
export const D50: WhitePoint = { X: 0.96422, Y: 1.0, Z: 0.82521 };
export const A:   WhitePoint = { X: 1.09850, Y: 1.0, Z: 0.35585 };
export const E:   WhitePoint = { X: 1.0,     Y: 1.0, Z: 1.0     };

/**
 * Planck's blackbody spectral radiance (Wm⁻²sr⁻¹m⁻¹) at temperature T (K) and wavelength λ (m).
 * Hecht §3.5.2 / Planck 1900.
 */
export function planckRadiance(lambdaMeters: number, T: number): number {
  const h = 6.62607015e-34;
  const c = 299_792_458;
  const k = 1.380649e-23;
  const num = (2 * h * c * c) / Math.pow(lambdaMeters, 5);
  const exponent = (h * c) / (lambdaMeters * k * T);
  const denom = Math.exp(exponent) - 1;
  return num / denom;
}

/**
 * Convert color temperature (K) to CIE 1931 xy chromaticity (Planckian locus).
 * Uses Krystek 1985 cubic approximation, accurate to ΔE < 1 for 1000K–25000K.
 */
export function planckianXY(T: number): { x: number; y: number } {
  // Krystek 1985
  const x =
    T < 4000
      ? -0.2661239e9 / (T * T * T) - 0.2343589e6 / (T * T) + 0.8776956e3 / T + 0.179910
      : -3.0258469e9 / (T * T * T) + 2.1070379e6 / (T * T) + 0.2226347e3 / T + 0.240390;

  const y =
    T < 2222
      ? -1.1063814 * x ** 3 - 1.34811020 * x ** 2 + 2.18555832 * x - 0.20219683
      : T < 4000
      ? -0.9549476 * x ** 3 - 1.37418593 * x ** 2 + 2.09137015 * x - 0.16748867
      : 3.0817580 * x ** 3 - 5.87338670 * x ** 2 + 3.75112997 * x - 0.37001483;

  return { x, y };
}
