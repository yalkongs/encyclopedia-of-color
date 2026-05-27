/*
 * Spectral integration utilities.
 * Source: ASTM E308-18; Wyszecki & Stiles, Color Science 2e §3.
 */

import { CMF_1931_2DEG, WAVELENGTH_STEP } from './cmf';

export interface XYZ { X: number; Y: number; Z: number }

export type SpectrumFn = (lambdaNm: number) => number;

/**
 * Integrate a spectral function S(λ) [W·sr⁻¹·m⁻²·nm⁻¹] against the 1931 2° observer to XYZ.
 * Uses 5nm trapezoidal sum over the visible range (380–780nm).
 */
export function spectralToXYZ(S: SpectrumFn): XYZ {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (const row of CMF_1931_2DEG) {
    const s = S(row.lambda);
    X += s * row.xBar;
    Y += s * row.yBar;
    Z += s * row.zBar;
  }
  return {
    X: X * WAVELENGTH_STEP,
    Y: Y * WAVELENGTH_STEP,
    Z: Z * WAVELENGTH_STEP,
  };
}

/**
 * Linearly-encoded sRGB (D65 reference) from CIE XYZ.
 * Matrix from IEC 61966-2-1; gamma encoding included.
 * Returns RGB clamped to [0,1].
 */
export function xyzToSrgb(xyz: XYZ): { r: number; g: number; b: number } {
  const { X, Y, Z } = xyz;
  // Linear RGB (D65)
  const rL =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const gL = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
  const bL =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  return {
    r: clamp01(srgbGamma(rL)),
    g: clamp01(srgbGamma(gL)),
    b: clamp01(srgbGamma(bL)),
  };
}

function srgbGamma(c: number): number {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function rgbToCssHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (v: number) => {
    const i = Math.round(v * 255);
    return i.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToCssRgb({ r, g, b }: { r: number; g: number; b: number }): string {
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return `rgb(${ri}, ${gi}, ${bi})`;
}
