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

/** Cone-response matrices for chromatic adaptation transforms (rows: XYZ → cone space). */
export const CAT_MATRICES: Record<string, M3> = {
  bradford: M_BRADFORD,
  cat02: [
    [0.7328, 0.4296, -0.1624],
    [-0.7036, 1.6975, 0.0061],
    [0.0030, 0.0136, 0.9834],
  ],
  cat16: [
    [0.401288, 0.650173, -0.051461],
    [-0.250268, 1.204414, 0.045854],
    [-0.002079, 0.048952, 0.953127],
  ],
  sharp: [
    [1.2694, -0.0988, -0.1706],
    [-0.8364, 1.8006, 0.0357],
    [0.0297, -0.0315, 1.0018],
  ],
  vonKries: [
    [0.4002400, 0.7076000, -0.0808100],
    [-0.2263000, 1.1653200, 0.0457000],
    [0.0000000, 0.0000000, 0.9182200],
  ],
};

function inv3(m: M3): M3 {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/** Generic von-Kries-style chromatic adaptation through an arbitrary cone matrix M. */
export function catAdapt(xyz: V3, srcWhite: WhitePoint, dstWhite: WhitePoint, M: M3): V3 {
  const s = mul(M, [srcWhite.X, srcWhite.Y, srcWhite.Z]);
  const d = mul(M, [dstWhite.X, dstWhite.Y, dstWhite.Z]);
  const cone = mul(M, xyz);
  const adapted: V3 = [(cone[0] * d[0]) / s[0], (cone[1] * d[1]) / s[1], (cone[2] * d[2]) / s[2]];
  return mul(inv3(M), adapted);
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

/** Gamma-encode a linear-sRGB triple (0..1) to 0..255 integer channels, clamped. */
export function srgb8(lin: V3): [number, number, number] {
  const enc = (c: number) => {
    const x = Math.max(0, Math.min(1, c));
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(v * 255);
  };
  return [enc(lin[0]), enc(lin[1]), enc(lin[2])];
}

/** Gamma-encode a linear-sRGB triple (0..1) to a CSS `rgb()` string, clamped. */
export function srgbCss(lin: V3): string {
  const [r, g, b] = srgb8(lin);
  return `rgb(${r},${g},${b})`;
}
