/*
 * Colour-difference metrics and discrimination data.
 *   - CIE L*a*b* from XYZ (D65)
 *   - ΔE*ab (CIE76) and ΔE00 (CIEDE2000)
 *   - MacAdam (1942) just-noticeable-difference ellipses
 *
 * Sources: CIE 15:2018; CIE 224:2017; Sharma, Wu & Dalal (2005) — the CIEDE2000
 * reference implementation and test data; MacAdam (1942), as tabulated in
 * Wyszecki & Stiles, Color Science 2e, Table 2(5.4.1) (observer PGN).
 */

import { CMF_1931_2DEG } from './cmf';
import { D65, type WhitePoint } from './illuminants';
import { linearSrgbFromXyz, srgbCss } from './color-adaptation';

export type Lab = [number, number, number];
type V3 = [number, number, number];

const DEG = Math.PI / 180;

function fLab(t: number): number {
  const d = 6 / 29;
  return t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
}

/** XYZ (Y normalised near 1) → CIE L*a*b* under the given white (default D65). */
export function xyzToLab(xyz: V3, white: WhitePoint = D65): Lab {
  const fx = fLab(xyz[0] / white.X), fy = fLab(xyz[1] / white.Y), fz = fLab(xyz[2] / white.Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function deltaE76(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** CIE L*a*b* → XYZ under the given white (default D65). */
export function labToXyz(lab: Lab, white: WhitePoint = D65): V3 {
  const d = 6 / 29;
  const fy = (lab[0] + 16) / 116, fx = fy + lab[1] / 500, fz = fy - lab[2] / 200;
  const inv = (f: number) => (f > d ? f * f * f : 3 * d * d * (f - 4 / 29));
  return [inv(fx) * white.X, inv(fy) * white.Y, inv(fz) * white.Z];
}

/** Lab → gamma-encoded sRGB CSS string (clamped). */
export function labToCss(lab: Lab): string {
  return srgbCss(linearSrgbFromXyz(labToXyz(lab)));
}

/** CIE 1976 u', v' chromaticity from XYZ. */
export function uvPrime(xyz: V3): [number, number] {
  const d = xyz[0] + 15 * xyz[1] + 3 * xyz[2] || 1e-9;
  return [(4 * xyz[0]) / d, (9 * xyz[1]) / d];
}

/** XYZ → CIE L*u*v* under the given white (default D65). */
export function xyzToLuv(xyz: V3, white: WhitePoint = D65): Lab {
  const [up, vp] = uvPrime(xyz);
  const [unp, vnp] = uvPrime([white.X, white.Y, white.Z]);
  const yr = xyz[1] / white.Y;
  const L = yr > Math.pow(6 / 29, 3) ? 116 * Math.cbrt(yr) - 16 : Math.pow(29 / 3, 3) * yr;
  return [L, 13 * L * (up - unp), 13 * L * (vp - vnp)];
}

/** CIE L*u*v* → XYZ under the given white (default D65). */
export function luvToXyz(luv: Lab, white: WhitePoint = D65): V3 {
  const [L, u, v] = luv;
  if (L <= 0) return [0, 0, 0];
  const [unp, vnp] = uvPrime([white.X, white.Y, white.Z]);
  const up = u / (13 * L) + unp;
  const vp = v / (13 * L) + vnp;
  const Y = L > 8 ? white.Y * Math.pow((L + 16) / 116, 3) : white.Y * L * Math.pow(3 / 29, 3);
  const X = Y * (9 * up) / (4 * vp);
  const Z = Y * (12 - 3 * up - 20 * vp) / (4 * vp);
  return [X, Y, Z];
}

/** True if a linear-sRGB triple is inside the displayable gamut. */
export function srgbInGamut(lin: V3, eps = 0.002): boolean {
  return lin.every((c) => c >= -eps && c <= 1 + eps);
}

/** CIEDE2000 colour difference (Sharma 2005 formulation, k_L=k_C=k_H=1). */
export interface CIEDE2000Terms {
  dE: number;
  tL: number; // weighted lightness term ΔL'/SL
  tC: number; // weighted chroma term ΔC'/SC
  tH: number; // weighted hue term ΔH'/SH
  RT: number; // rotation coefficient (couples C and H in the blue region)
  rot: number; // signed rotation contribution RT·tC·tH (under the root)
}

/** Full CIEDE2000 decomposition (Sharma, Wu & Dalal 2005). Verified vs reference data. */
export function deltaE2000Terms(lab1: Lab, lab2: Lab): CIEDE2000Terms {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (b: number, ap: number) => {
    if (b === 0 && ap === 0) return 0;
    let h = Math.atan2(b, ap) / DEG;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else dhp = diff > 180 ? diff - 360 : diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T = 1
    - 0.17 * Math.cos((hbarp - 30) * DEG)
    + 0.24 * Math.cos((2 * hbarp) * DEG)
    + 0.32 * Math.cos((3 * hbarp + 6) * DEG)
    - 0.20 * Math.cos((4 * hbarp - 63) * DEG);
  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin((2 * dTheta) * DEG) * RC;

  const tL = dLp / SL, tC = dCp / SC, tH = dHp / SH;
  const rot = RT * tC * tH;
  return { dE: Math.sqrt(tL * tL + tC * tC + tH * tH + rot), tL, tC, tH, RT, rot };
}

export function deltaE2000(lab1: Lab, lab2: Lab): number {
  return deltaE2000Terms(lab1, lab2).dE;
}

/*
 * CIE94 colour difference (CIE 116-1995). The first argument is the reference;
 * chroma weights SC, SH derive from C1. `textiles` swaps the graphic-arts
 * parameters (kL=1, K1=.045, K2=.015) for textile ones (kL=2, K1=.048, K2=.014).
 * Verified vs colour-science: graphic [100,21.57,272.23]→[100,426.68,72.40] = 83.779.
 */
export function deltaE94(ref: Lab, sample: Lab, textiles = false): number {
  const kL = textiles ? 2 : 1;
  const K1 = textiles ? 0.048 : 0.045;
  const K2 = textiles ? 0.014 : 0.015;
  const [L1, a1, b1] = ref, [L2, a2, b2] = sample;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const dL = L1 - L2, dC = C1 - C2, da = a1 - a2, db = b1 - b2;
  const dH = Math.sqrt(Math.max(0, da * da + db * db - dC * dC));
  const SC = 1 + K1 * C1, SH = 1 + K2 * C1;
  return Math.hypot(dL / kL, dC / SC, dH / SH);
}

/*
 * CMC(l:c) colour difference (Clarke, McDonald & Rigg 1984; ISO 105-J03).
 * Default l=2,c=1 = textile acceptability tolerance; l=c=1 = perceptibility.
 * The first argument is the reference (C1, h1 set the anisotropic ellipsoid).
 * Verified vs colour-science: [48.99,-0.106,400.66]→[50.66,-0.117,402.82] (l=2) = 0.8997.
 */
export function deltaECMC(ref: Lab, sample: Lab, l = 2, c = 1): number {
  const [L1, a1, b1] = ref, [L2, a2, b2] = sample;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const dL = L1 - L2, dC = C1 - C2, da = a1 - a2, db = b1 - b2;
  const dH = Math.sqrt(Math.max(0, da * da + db * db - dC * dC));
  let H1 = Math.atan2(b1, a1) / DEG;
  if (H1 < 0) H1 += 360;
  const T = H1 >= 164 && H1 <= 345
    ? 0.56 + Math.abs(0.2 * Math.cos((H1 + 168) * DEG))
    : 0.36 + Math.abs(0.4 * Math.cos((H1 + 35) * DEG));
  const C1_4 = C1 ** 4;
  const F = Math.sqrt(C1_4 / (C1_4 + 1900));
  const SL = L1 < 16 ? 0.511 : (0.040975 * L1) / (1 + 0.01765 * L1);
  const SC = (0.0638 * C1) / (1 + 0.0131 * C1) + 0.638;
  const SH = SC * (F * T + 1 - F);
  return Math.hypot(dL / (l * SL), dC / (c * SC), dH / SH);
}

/**
 * MacAdam (1942) ellipses, observer PGN — *calculated* parameters from
 * Wyszecki & Stiles Table 2(5.4.1). a, b are semi-axis lengths in chromaticity
 * units (the published 10³·a values divided by 1000); theta is the angle of the
 * semi-major axis from the +x direction, in degrees.
 */
export interface MacAdamEllipse { x: number; y: number; a: number; b: number; theta: number; }

const RAW_MACADAM: Array<[number, number, number, number, number]> = [
  [0.160, 0.057, 0.94, 0.30, 62.3], [0.187, 0.118, 2.31, 0.44, 74.8],
  [0.253, 0.125, 2.49, 0.49, 54.8], [0.150, 0.680, 9.09, 2.21, 102.9],
  [0.131, 0.521, 4.67, 2.10, 110.5], [0.212, 0.550, 5.63, 2.30, 100.0],
  [0.258, 0.450, 4.54, 2.08, 88.5], [0.152, 0.365, 3.81, 1.86, 111.0],
  [0.280, 0.385, 4.26, 1.46, 74.6], [0.380, 0.498, 4.23, 1.32, 69.4],
  [0.160, 0.200, 2.08, 0.94, 95.4], [0.228, 0.250, 3.09, 0.82, 70.9],
  [0.305, 0.323, 2.55, 0.68, 57.2], [0.385, 0.393, 3.70, 1.48, 65.5],
  [0.472, 0.399, 3.21, 1.30, 54.0], [0.527, 0.350, 2.56, 1.27, 22.8],
  [0.475, 0.300, 2.89, 0.99, 29.1], [0.510, 0.236, 2.40, 1.15, 30.7],
  [0.596, 0.283, 2.49, 1.15, 11.1], [0.344, 0.284, 2.24, 0.97, 65.7],
  [0.390, 0.237, 2.43, 0.98, 44.2], [0.441, 0.198, 2.73, 0.90, 33.7],
  [0.278, 0.223, 2.34, 0.61, 60.3], [0.300, 0.163, 3.01, 0.60, 53.4],
  [0.365, 0.153, 4.12, 0.90, 38.6],
];

export const MACADAM_ELLIPSES: MacAdamEllipse[] = RAW_MACADAM.map(([x, y, a, b, theta]) => ({
  x, y, a: a / 1000, b: b / 1000, theta,
}));

/** CIE 1931 spectral locus (xy) sampled from the 2° CMF. */
export const SPECTRAL_LOCUS: Array<[number, number]> = CMF_1931_2DEG.map((r) => {
  const s = r.xBar + r.yBar + r.zBar;
  return [r.xBar / s, r.yBar / s] as [number, number];
});

/** Approximate display colour for a chromaticity (x, y), normalised to max channel. */
export function xyToCss(x: number, y: number): string {
  if (y <= 1e-4) return 'rgb(0,0,0)';
  const lin = linearSrgbFromXyz([x / y, 1, (1 - x - y) / y]);
  const m = Math.max(lin[0], lin[1], lin[2], 1e-6);
  return srgbCss([lin[0] / m, lin[1] / m, lin[2] / m]);
}
