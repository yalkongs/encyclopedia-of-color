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

/*
 * Brettel-Viénot-Mollon (1997/1999) LMS pipeline — the canonical dichromat
 * simulation. linear-sRGB ↔ LMS matrices and the per-type cone-replacement
 * coefficients are the widely-used Viénot 1999 values (DaltonLens reference).
 */
type V3 = [number, number, number];
type M3 = [V3, V3, V3];

const LMS_FROM_LINRGB: M3 = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LINRGB_FROM_LMS: M3 = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];

function mul(m: M3, v: V3): V3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}
const decode = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encode = (c: number) => {
  const x = Math.max(0, Math.min(1, c));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
};

/** linear-sRGB → LMS (Viénot matrix). */
export function linRgbToLms(lin: V3): V3 { return mul(LMS_FROM_LINRGB, lin); }
/** sRGB (gamma, 0..1) → LMS. */
export function srgbToLms(rgb: { r: number; g: number; b: number }): V3 {
  return linRgbToLms([decode(rgb.r), decode(rgb.g), decode(rgb.b)]);
}

/** Replace the deficient cone with the dichromat plane (Viénot coefficients). */
export function projectDichromat(lms: V3, type: Exclude<CVDType, 'normal'>): V3 {
  const [L, M, S] = lms;
  if (type === 'protanopia') return [2.02344 * M - 2.52581 * S, M, S];
  if (type === 'deuteranopia') return [L, 0.494207 * L + 1.24827 * S, S];
  return [L, M, -0.395913 * L + 0.801109 * M]; // tritanopia
}

/** Full Brettel-Viénot dichromat simulation on sRGB (gamma, 0..1). */
export function simulateBrettel(
  rgb: { r: number; g: number; b: number },
  type: CVDType,
): { r: number; g: number; b: number } {
  if (type === 'normal') return rgb;
  const lin: V3 = [decode(rgb.r), decode(rgb.g), decode(rgb.b)];
  const out = mul(LINRGB_FROM_LMS, projectDichromat(linRgbToLms(lin), type));
  return { r: encode(out[0]), g: encode(out[1]), b: encode(out[2]) };
}

// Error-redistribution matrices (Fidaner et al.) for Daltonization, per type.
const DALTON_SHIFT: Record<Exclude<CVDType, 'normal'>, M3> = {
  protanopia: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  deuteranopia: [[1, 0, 0.7], [0, 1, 0], [0, 0, 1]],
  tritanopia: [[1, 0, 0], [0, 1, 0.7], [0, 0, 1]],
};

/**
 * Daltonization: push the colour information a dichromat loses into channels
 * they can still see. Operates on sRGB (gamma, 0..1).
 */
export function daltonize(
  rgb: { r: number; g: number; b: number },
  type: CVDType,
): { r: number; g: number; b: number } {
  if (type === 'normal') return rgb;
  const sim = simulateBrettel(rgb, type);
  const err: V3 = [rgb.r - sim.r, rgb.g - sim.g, rgb.b - sim.b];
  const shift = mul(DALTON_SHIFT[type], err);
  return {
    r: Math.max(0, Math.min(1, rgb.r + shift[0])),
    g: Math.max(0, Math.min(1, rgb.g + shift[1])),
    b: Math.max(0, Math.min(1, rgb.b + shift[2])),
  };
}
