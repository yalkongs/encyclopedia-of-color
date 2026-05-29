/*
 * CIECAM02 forward model (CIE 159:2004; Fairchild, Color Appearance Models 3e §16).
 * XYZ (0..100) + viewing conditions → correlates J, C, h, M, Q, s.
 * Verified against colour-science: XYZ[19.01,20,21.78], white[95.05,100,108.88],
 * L_A=318.31, Y_b=20, average surround → J≈41.73, C≈0.1, h≈219, M≈0.11, Q≈195.4.
 */

import type { V3, M3 } from './rgb-spaces';
import { mul3 } from './rgb-spaces';

const DEG = Math.PI / 180;

const M_CAT02: M3 = [
  [0.7328, 0.4296, -0.1624],
  [-0.7036, 1.6975, 0.0061],
  [0.0030, 0.0136, 0.9834],
];
const M_CAT02_INV: M3 = [
  [1.096124, -0.278869, 0.182745],
  [0.454369, 0.473533, 0.072098],
  [-0.009628, -0.005698, 1.015326],
];
const M_HPE: M3 = [
  [0.38971, 0.68898, -0.07868],
  [-0.22981, 1.18340, 0.04641],
  [0.0, 0.0, 1.0],
];

export interface Surround { F: number; c: number; Nc: number; }
export const SURROUND_AVERAGE: Surround = { F: 1.0, c: 0.69, Nc: 1.0 };
export const SURROUND_DIM: Surround = { F: 0.9, c: 0.59, Nc: 0.95 };
export const SURROUND_DARK: Surround = { F: 0.8, c: 0.525, Nc: 0.8 };

export interface CAM02 { J: number; C: number; h: number; M: number; Q: number; s: number; }

const nonlin = (x: number) => {
  const t = (Math.abs(x) / 100) ** 0.42;
  return Math.sign(x) * (400 * t) / (27.13 + t) + 0.1;
};

/** CIECAM02 forward transform. XYZ and XYZ_w on the 0..100 scale. */
export function ciecam02(xyz: V3, xyzW: V3, LA: number, Yb: number, sur: Surround = SURROUND_AVERAGE): CAM02 {
  const Yw = xyzW[1];
  const rgb = mul3(M_CAT02, xyz);
  const rgbW = mul3(M_CAT02, xyzW);
  const D = Math.max(0, Math.min(1, sur.F * (1 - (1 / 3.6) * Math.exp((-LA - 42) / 92))));
  const Dr = rgb.map((c, i) => c * (D * (Yw / rgbW[i]) + 1 - D)) as V3;
  const DrW = rgbW.map((c) => c * (D * (Yw / c) + 1 - D)) as V3;

  const k = 1 / (5 * LA + 1);
  const k4 = k ** 4;
  const FL = 0.2 * k4 * (5 * LA) + 0.1 * (1 - k4) ** 2 * (5 * LA) ** (1 / 3);
  const n = Yb / Yw;
  const z = 1.48 + Math.sqrt(n);
  const Nbb = 0.725 * (1 / n) ** 0.2;
  const Ncb = Nbb;

  const toHpe = (v: V3) => mul3(M_HPE, mul3(M_CAT02_INV, v));
  const rgbP = toHpe(Dr);
  const rgbPW = toHpe(DrW);
  const ra = rgbP.map((c) => nonlin(FL * c)) as V3;
  const raW = rgbPW.map((c) => nonlin(FL * c)) as V3;

  const a = ra[0] - (12 * ra[1]) / 11 + ra[2] / 11;
  const b = (ra[0] + ra[1] - 2 * ra[2]) / 9;
  let h = Math.atan2(b, a) / DEG;
  if (h < 0) h += 360;
  const et = 0.25 * (Math.cos(h * DEG + 2) + 3.8);

  const A = (2 * ra[0] + ra[1] + ra[2] / 20 - 0.305) * Nbb;
  const Aw = (2 * raW[0] + raW[1] + raW[2] / 20 - 0.305) * Nbb;
  const J = 100 * (A / Aw) ** (sur.c * z);
  const Q = (4 / sur.c) * Math.sqrt(J / 100) * (Aw + 4) * FL ** 0.25;
  const t = ((50000 / 13) * sur.Nc * Ncb * et * Math.sqrt(a * a + b * b)) /
    (ra[0] + ra[1] + (21 / 20) * ra[2]);
  const C = t ** 0.9 * Math.sqrt(J / 100) * (1.64 - 0.29 ** n) ** 0.73;
  const M = C * FL ** 0.25;
  const s = 100 * Math.sqrt(M / Q);
  return { J, C, h, M, Q, s };
}
