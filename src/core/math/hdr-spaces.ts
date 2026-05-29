/*
 * HDR colour encodings: the SMPTE ST 2084 PQ curve, BT.2100 ICtCp, and
 * Jzazbz (Safdar et al. 2017). Verified against colour-science reference data:
 *   ICtCp:  Rec.2020 lin [0.4562,0.0308,0.0409] → [0.07351,0.00475,0.09352]
 *   Jzazbz: XYZ [0.20654,0.12197,0.05137] → [0.00535,0.00924,0.00526]
 */

import type { V3, M3 } from './rgb-spaces';
import { mul3 } from './rgb-spaces';

// ---- SMPTE ST 2084 Perceptual Quantizer ----
const PQ_M1 = 2610 / 16384;
const PQ_M2 = (2523 / 4096) * 128;
const PQ_C1 = 3424 / 4096;
const PQ_C2 = (2413 / 4096) * 32;
const PQ_C3 = (2392 / 4096) * 32;

/** SMPTE ST 2084 inverse EOTF: absolute luminance C (cd/m²) → PQ code (0..1), peak L_p. */
export function pqEncode(c: number, Lp = 10000): number {
  const yp = (Math.max(c, 0) / Lp) ** PQ_M1;
  return ((PQ_C1 + PQ_C2 * yp) / (1 + PQ_C3 * yp)) ** PQ_M2;
}

/** SMPTE ST 2084 EOTF: PQ code (0..1) → absolute luminance (cd/m²), peak L_p. */
export function pqDecode(n: number, Lp = 10000): number {
  const np = Math.max(n, 0) ** (1 / PQ_M2);
  return Lp * (Math.max(np - PQ_C1, 0) / (PQ_C2 - PQ_C3 * np)) ** (1 / PQ_M1);
}

// ---- BT.2100 ICtCp ----
const M_LMS: M3 = [
  [1688 / 4096, 2146 / 4096, 262 / 4096],
  [683 / 4096, 2951 / 4096, 462 / 4096],
  [99 / 4096, 309 / 4096, 3688 / 4096],
];
const M_ICTCP: M3 = [
  [0.5, 0.5, 0],
  [6610 / 4096, -13613 / 4096, 7003 / 4096],
  [17933 / 4096, -17390 / 4096, -543 / 4096],
];

/** Linear Rec.2020 RGB (0..1, 1 = peak L_p) → ICtCp. Default L_p = 10000 cd/m². */
export function rgb2020ToICtCp(rgb: V3, Lp = 10000): V3 {
  const lms = mul3(M_LMS, rgb);
  const enc = lms.map((c) => pqEncode(c, Lp)) as V3;
  return mul3(M_ICTCP, enc);
}

// ---- BT.2100 Hybrid Log-Gamma OETF ----
const HLG_A = 0.17883277, HLG_B = 0.28466892, HLG_C = 0.55991073;

/** HLG OETF: scene-linear light (0..1) → signal (0..1). Continuous at E=1/12 → 0.5. */
export function hlgEncode(e: number): number {
  const x = Math.max(e, 0);
  return x <= 1 / 12 ? Math.sqrt(3 * x) : HLG_A * Math.log(12 * x - HLG_B) + HLG_C;
}

/** HLG inverse OETF: signal (0..1) → scene-linear light (0..1). */
export function hlgDecode(v: number): number {
  const x = Math.max(v, 0);
  return x <= 0.5 ? (x * x) / 3 : (Math.exp((x - HLG_C) / HLG_A) + HLG_B) / 12;
}

// ---- Jzazbz (Safdar 2017) ----
const JZ_B = 1.15, JZ_G = 0.66, JZ_D = -0.56, JZ_D0 = 1.6295499532821566e-11;
const JZ_N = 2610 / 16384;
const JZ_P = 1.7 * (2523 / 4096) * 128;
const M_JZ: M3 = [
  [0.41478972, 0.579999, 0.0146480],
  [-0.2015100, 1.120649, 0.0531008],
  [-0.0166008, 0.2648000, 0.6684799],
];
function jzPerceptual(c: number): number {
  const cp = (Math.max(c, 0) / 10000) ** JZ_N;
  return ((PQ_C1 + PQ_C2 * cp) / (1 + PQ_C3 * cp)) ** JZ_P;
}

/** Absolute XYZ (D65, cd/m²) → Jzazbz [Jz, az, bz]. */
export function xyzToJzazbz(xyz: V3): V3 {
  const [X, Y, Z] = xyz;
  const Xp = JZ_B * X - (JZ_B - 1) * Z;
  const Yp = JZ_G * Y - (JZ_G - 1) * X;
  const lms = mul3(M_JZ, [Xp, Yp, Z]);
  const [L, M, S] = lms.map(jzPerceptual);
  const Iz = 0.5 * (L + M);
  const az = 3.524000 * L - 4.066708 * M + 0.542708 * S;
  const bz = 0.199076 * L + 1.096799 * M - 1.295875 * S;
  const Jz = ((1 + JZ_D) * Iz) / (1 + JZ_D * Iz) - JZ_D0;
  return [Jz, az, bz];
}
