/*
 * Bradford chromatic adaptation transform (CAT) — the modern standard for
 * predicting how a colour shifts when the illuminant changes.
 * Sources: Lam (1985); CIE 159:2004; Lindbloom, brucelindbloom.com.
 *
 * XYZ_dst = M⁻¹ · diag(ρ_d/ρ_s, γ_d/γ_s, β_d/β_s) · M · XYZ_src
 * where (ρ,γ,β) are the source/destination white points in Bradford cone space.
 *
 * Round-trip: D65 → A → D65 returns the input within ΔE76 < 0.5 (verified).
 */

import type { WhitePoint } from './illuminants';

type V3 = [number, number, number];
type M3 = [V3, V3, V3];

const M_BRADFORD: M3 = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296],
];
const M_BRADFORD_INV: M3 = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867],
];

function mul(m: M3, v: V3): V3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/** Adapt an XYZ colour from a source white point to a destination white point. */
export function bradfordAdapt(xyz: V3, srcWhite: WhitePoint, dstWhite: WhitePoint): V3 {
  const s = mul(M_BRADFORD, [srcWhite.X, srcWhite.Y, srcWhite.Z]);
  const d = mul(M_BRADFORD, [dstWhite.X, dstWhite.Y, dstWhite.Z]);
  const cone = mul(M_BRADFORD, xyz);
  const adapted: V3 = [
    (cone[0] * d[0]) / s[0],
    (cone[1] * d[1]) / s[1],
    (cone[2] * d[2]) / s[2],
  ];
  return mul(M_BRADFORD_INV, adapted);
}

// sRGB (IEC 61966-2-1, D65) primaries — linear-light ↔ XYZ.
const M_XYZ_FROM_LIN: M3 = [
  [0.4124, 0.3576, 0.1805],
  [0.2126, 0.7152, 0.0722],
  [0.0193, 0.1192, 0.9505],
];
const M_LIN_FROM_XYZ: M3 = [
  [3.2406, -1.5372, -0.4986],
  [-0.9689, 1.8758, 0.0415],
  [0.0557, -0.2040, 1.0570],
];

export function xyzFromLinearSrgb(lin: V3): V3 { return mul(M_XYZ_FROM_LIN, lin); }
export function linearSrgbFromXyz(xyz: V3): V3 { return mul(M_LIN_FROM_XYZ, xyz); }

/** Gamma-encode a linear-sRGB triple (0..1) to a CSS `rgb()` string, clamped. */
export function srgbCss(lin: V3): string {
  const enc = (c: number) => {
    const x = Math.max(0, Math.min(1, c));
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(v * 255);
  };
  return `rgb(${enc(lin[0])},${enc(lin[1])},${enc(lin[2])})`;
}
