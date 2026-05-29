/*
 * HDR → SDR tone-mapping operators (scalar, applied per-channel on linear light).
 * Input x is linear scene/relative luminance ≥ 0; output is display-referred 0..1.
 *
 * Sources:
 *   Reinhard et al. (2002), "Photographic Tone Reproduction for Digital Images", §3–4.
 *   Narkowicz (2016), "ACES Filmic Tone Mapping Curve" — a cheap fit to the ACES RRT+ODT,
 *     NOT the full reference pipeline.
 *   Hable (2010), "Uncharted 2: HDR Lighting" — the filmic operator, normalised to white W.
 */

/** Simple Reinhard: x / (1 + x). Compresses everything, never reaches 1. */
export function reinhard(x: number): number {
  return x / (1 + x);
}

/** Extended Reinhard with a white point W that is mapped to 1. */
export function reinhardExtended(x: number, white = 4): number {
  return (x * (1 + x / (white * white))) / (1 + x);
}

/** Narkowicz's cheap fit to the ACES filmic curve (approximation, not reference ACES). */
export function acesNarkowicz(x: number): number {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e)));
}

const HABLE_A = 0.15, HABLE_B = 0.50, HABLE_C = 0.10, HABLE_D = 0.20, HABLE_E = 0.02, HABLE_F = 0.30;
function hableRaw(x: number): number {
  return ((x * (HABLE_A * x + HABLE_C * HABLE_B) + HABLE_D * HABLE_E) /
    (x * (HABLE_A * x + HABLE_B) + HABLE_D * HABLE_F)) - HABLE_E / HABLE_F;
}

/** Hable (Uncharted 2) filmic operator, normalised so that white W maps to 1. */
export function hable(x: number, white = 11.2): number {
  return hableRaw(x) / hableRaw(white);
}

export const TONEMAP_OPERATORS = {
  reinhard,
  reinhardExtended,
  aces: acesNarkowicz,
  hable,
} as const;
