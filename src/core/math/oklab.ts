/*
 * OKLab / OKLCH — Björn Ottosson's perceptual colour space (2020).
 * https://bottosson.github.io/posts/oklab/
 *
 * Defined directly from linear-light sRGB. Verified round-trips:
 *   linRGB(1,1,1) → L≈1, a≈0, b≈0;  (0,0,0) → 0;  (0.5,0.5,0.5) → L≈0.7937.
 */

type V3 = [number, number, number];

/** Linear-light sRGB (0..1) → OKLab [L, a, b]. */
export function linSrgbToOklab(rgb: V3): V3 {
  const [r, g, b] = rgb;
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** OKLab [L, a, b] → linear-light sRGB (may fall outside 0..1 when out of gamut). */
export function oklabToLinSrgb(lab: V3): V3 {
  const [L, a, b] = lab;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/** OKLab → OKLCH: [L, C, h°] with h in 0..360. */
export function oklabToOklch(lab: V3): V3 {
  const [L, a, b] = lab;
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, Math.hypot(a, b), h];
}

/** OKLCH [L, C, h°] → OKLab. */
export function oklchToOklab(lch: V3): V3 {
  const [L, C, h] = lch;
  const r = (h * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}

/** sRGB transfer function: gamma-encoded component (0..1) → linear-light (0..1). */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
