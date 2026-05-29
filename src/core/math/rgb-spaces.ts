/*
 * RGB working-space primaries and their linear-light RGB ↔ XYZ matrices.
 * Matrices are derived from chromaticities + white point (Lindbloom method),
 * verified: the sRGB matrix matches IEC 61966-2-1 to 4 decimals.
 */

import { D65, type WhitePoint } from './illuminants';

export type V3 = [number, number, number];
export type M3 = [V3, V3, V3];

export function mul3(m: M3, v: V3): V3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

export function inv3(m: M3): M3 {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

export interface RgbSpace {
  name: string;
  primaries: { r: [number, number]; g: [number, number]; b: [number, number] };
  white: WhitePoint;
  toXyz: M3;
  fromXyz: M3;
}

/** Build the linear RGB → XYZ matrix from xy primaries and a white point. */
export function rgbToXyzMatrix(
  r: [number, number], g: [number, number], b: [number, number], w: WhitePoint,
): M3 {
  const col = (xy: [number, number]): V3 => [xy[0] / xy[1], 1, (1 - xy[0] - xy[1]) / xy[1]];
  const Xr = col(r), Xg = col(g), Xb = col(b);
  const P: M3 = [
    [Xr[0], Xg[0], Xb[0]],
    [Xr[1], Xg[1], Xb[1]],
    [Xr[2], Xg[2], Xb[2]],
  ];
  const S = mul3(inv3(P), [w.X, w.Y, w.Z]);
  return [
    [Xr[0] * S[0], Xg[0] * S[1], Xb[0] * S[2]],
    [Xr[1] * S[0], Xg[1] * S[1], Xb[1] * S[2]],
    [Xr[2] * S[0], Xg[2] * S[1], Xb[2] * S[2]],
  ];
}

function makeSpace(name: string, r: [number, number], g: [number, number], b: [number, number], w = D65): RgbSpace {
  const toXyz = rgbToXyzMatrix(r, g, b, w);
  return { name, primaries: { r, g, b }, white: w, toXyz, fromXyz: inv3(toXyz) };
}

export const SRGB = makeSpace('sRGB / Rec.709', [0.64, 0.33], [0.30, 0.60], [0.15, 0.06]);
export const DISPLAY_P3 = makeSpace('Display P3', [0.680, 0.320], [0.265, 0.690], [0.150, 0.060]);
export const ADOBE_RGB = makeSpace('Adobe RGB (1998)', [0.64, 0.33], [0.21, 0.71], [0.15, 0.06]);
export const BT2020 = makeSpace('BT.2020', [0.708, 0.292], [0.170, 0.797], [0.131, 0.046]);

/** Shoelace area of the chromaticity triangle — a proxy for 2D gamut size. */
export function gamutTriangleArea(s: RgbSpace): number {
  const { r, g, b } = s.primaries;
  return Math.abs((g[0] - r[0]) * (b[1] - r[1]) - (b[0] - r[0]) * (g[1] - r[1])) / 2;
}

/** Does this xy chromaticity fall inside the RGB space's primary triangle? */
export function xyInGamut(x: number, y: number, s: RgbSpace): boolean {
  const { r, g, b } = s.primaries;
  const sign = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
  const d1 = sign(x, y, r[0], r[1], g[0], g[1]);
  const d2 = sign(x, y, g[0], g[1], b[0], b[1]);
  const d3 = sign(x, y, b[0], b[1], r[0], r[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
