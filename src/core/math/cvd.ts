/*
 * Color Vision Deficiency simulation.
 * Source: Brettel, Viénot, Mollon (1997), "Computerized simulation of color appearance for dichromats",
 *         JOSA A 14(10), 2647–2655.
 * Matrix coefficients via Machado et al. (2009) sRGB direct approximation —
 * accurate enough for educational visualization without round-tripping to LMS.
 *
 * Inputs/outputs are sRGB in [0,1] linear or gamma — function operates linearly.
 */

export type CVDType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

const MATRICES: Record<CVDType, number[]> = {
  // 3x3 row-major, applied to linear sRGB
  normal:       [1, 0, 0,   0, 1, 0,   0, 0, 1],
  protanopia:   [0.152286, 1.052583, -0.204868,
                 0.114503, 0.786281,  0.099216,
                -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968,
                 0.280085, 0.672501,  0.047413,
                -0.011820,  0.042940, 0.968881],
  tritanopia:   [1.255528, -0.076749, -0.178779,
                -0.078411, 0.930809,  0.147602,
                 0.004733, 0.691367,  0.303900],
};

export function applyCVD(
  rgb: { r: number; g: number; b: number },
  type: CVDType,
): { r: number; g: number; b: number } {
  if (type === 'normal') return rgb;
  const m = MATRICES[type];
  const r = m[0] * rgb.r + m[1] * rgb.g + m[2] * rgb.b;
  const g = m[3] * rgb.r + m[4] * rgb.g + m[5] * rgb.b;
  const b = m[6] * rgb.r + m[7] * rgb.g + m[8] * rgb.b;
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b)),
  };
}

export function cycleCVD(current: CVDType): CVDType {
  const order: CVDType[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
