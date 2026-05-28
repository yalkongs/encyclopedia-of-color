/*
 * Photometry & blackbody helpers.
 * Sources: CIE 015:2018; CIE 1951 scotopic V'(λ); Hecht §3.5.2.
 */

import { CMF_1931_2DEG } from './cmf';

/** Maximum luminous efficacy (photopic, 555 nm) in lm/W. */
export const KM = 683.002;
/** Maximum luminous efficacy (scotopic, 507 nm) in lm/W. */
export const KM_PRIME = 1700;

/** Wien's displacement constant b = 2.897771955e-3 m·K, expressed in nm·K. */
export const WIEN_B_NM = 2.897771955e6;
/** Stefan-Boltzmann constant (W·m⁻²·K⁻⁴). */
export const SIGMA_SB = 5.670374419e-8;

/** Peak-emission wavelength (nm) of a blackbody at temperature T (K): λ = b/T. */
export function wienPeakNm(T: number): number {
  return WIEN_B_NM / T;
}

/** Total radiant exitance (W·m⁻²) of a blackbody: M = σ·T⁴. */
export function stefanBoltzmannExitance(T: number): number {
  return SIGMA_SB * Math.pow(T, 4);
}

function interp(table: ReadonlyArray<{ lambda: number; v: number }>, lambdaNm: number): number {
  if (lambdaNm <= table[0].lambda) return table[0].v;
  const last = table[table.length - 1];
  if (lambdaNm >= last.lambda) return last.v;
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (lambdaNm >= a.lambda && lambdaNm <= b.lambda) {
      const t = (lambdaNm - a.lambda) / (b.lambda - a.lambda);
      return a.v + (b.v - a.v) * t;
    }
  }
  return 0;
}

/** Photopic luminous-efficiency function V(λ) = CIE 1931 ȳ(λ), interpolated. */
export function vPhotopic(lambdaNm: number): number {
  const table = CMF_1931_2DEG.map((r) => ({ lambda: r.lambda, v: r.yBar }));
  return interp(table, lambdaNm);
}

/** CIE 1951 scotopic luminous-efficiency function V'(λ), peak 1.0 at 507 nm. */
export const V_SCOTOPIC: ReadonlyArray<{ lambda: number; v: number }> = [
  { lambda: 380, v: 0.000589 }, { lambda: 390, v: 0.002209 }, { lambda: 400, v: 0.00929 },
  { lambda: 410, v: 0.03484 }, { lambda: 420, v: 0.0966 }, { lambda: 430, v: 0.1998 },
  { lambda: 440, v: 0.3281 }, { lambda: 450, v: 0.455 }, { lambda: 460, v: 0.567 },
  { lambda: 470, v: 0.676 }, { lambda: 480, v: 0.793 }, { lambda: 490, v: 0.904 },
  { lambda: 500, v: 0.982 }, { lambda: 507, v: 1.000 }, { lambda: 510, v: 0.997 },
  { lambda: 520, v: 0.935 }, { lambda: 530, v: 0.811 }, { lambda: 540, v: 0.650 },
  { lambda: 550, v: 0.481 }, { lambda: 560, v: 0.3288 }, { lambda: 570, v: 0.2076 },
  { lambda: 580, v: 0.1212 }, { lambda: 590, v: 0.0655 }, { lambda: 600, v: 0.03315 },
  { lambda: 610, v: 0.01593 }, { lambda: 620, v: 0.00737 }, { lambda: 630, v: 0.003335 },
  { lambda: 640, v: 0.001497 }, { lambda: 650, v: 0.000677 }, { lambda: 660, v: 0.0003129 },
  { lambda: 670, v: 0.0001480 }, { lambda: 680, v: 0.0000715 }, { lambda: 690, v: 0.00003533 },
  { lambda: 700, v: 0.0000178 }, { lambda: 720, v: 0.00000478 }, { lambda: 740, v: 0.000001379 },
  { lambda: 760, v: 0.000000425 }, { lambda: 780, v: 0.000000139 },
];

/** Scotopic luminous-efficiency function V'(λ), interpolated. */
export function vScotopic(lambdaNm: number): number {
  return interp(V_SCOTOPIC, lambdaNm);
}
