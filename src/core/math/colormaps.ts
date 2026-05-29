/*
 * Scientific colormaps for data visualisation.
 * - cividis, turbo: exact compact polynomial fits from d3-scale-chromatic.
 * - viridis: 11 anchor points from matplotlib, linearly interpolated.
 * - jet: classic MATLAB piecewise (shown as the cautionary example).
 * - cubehelix: Green (2011) analytic formula, monotone luminance.
 */

export type RGB = [number, number, number]; // 0..255
const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

// ---- viridis (anchors, t in 0..1) ----
const VIRIDIS: RGB[] = [
  [68, 1, 84], [72, 36, 117], [65, 68, 135], [53, 95, 141], [42, 120, 142],
  [33, 145, 140], [34, 168, 132], [68, 191, 112], [122, 209, 81], [189, 223, 38], [253, 231, 37],
];
export function viridis(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  const x = t * (VIRIDIS.length - 1), i = Math.floor(x), f = x - i;
  const a = VIRIDIS[i], b = VIRIDIS[Math.min(i + 1, VIRIDIS.length - 1)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// ---- cividis (d3 polynomial) ----
export function cividis(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  return [
    clamp(-4.54 - t * (35.34 - t * (2381.73 - t * (6402.7 - t * (7024.72 - t * 2710.57))))),
    clamp(32.49 + t * (170.73 + t * (52.82 - t * (131.46 - t * (176.58 - t * 67.37))))),
    clamp(81.24 + t * (442.36 - t * (2482.43 - t * (6167.24 - t * (6614.94 - t * 2475.67))))),
  ];
}

// ---- turbo (d3 polynomial) ----
export function turbo(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  return [
    clamp(34.61 + t * (1172.33 - t * (10793.56 - t * (33300.12 - t * (38394.49 - t * 14825.05))))),
    clamp(23.31 + t * (557.33 + t * (1225.33 - t * (3574.96 - t * (1073.77 + t * 707.56))))),
    clamp(27.2 + t * (3211.1 - t * (15327.97 - t * (27814 - t * (22569.18 - t * 6838.66))))),
  ];
}

// ---- jet (classic, non-uniform — the cautionary case) ----
export function jet(t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  const r = Math.max(0, Math.min(1, Math.min(4 * t - 1.5, -4 * t + 4.5)));
  const g = Math.max(0, Math.min(1, Math.min(4 * t - 0.5, -4 * t + 3.5)));
  const b = Math.max(0, Math.min(1, Math.min(4 * t + 0.5, -4 * t + 2.5)));
  return [r * 255, g * 255, b * 255];
}

// ---- cubehelix (Green 2011) ----
export function cubehelix(t: number, start = 0.5, rotations = -1.5, hue = 1.2, gamma = 1.0): RGB {
  const a = hue * Math.pow(t, gamma) * (1 - Math.pow(t, gamma)) / 2;
  const phi = 2 * Math.PI * (start / 3 + rotations * t);
  const tg = Math.pow(t, gamma);
  const r = tg + a * (-0.14861 * Math.cos(phi) + 1.78277 * Math.sin(phi));
  const g = tg + a * (-0.29227 * Math.cos(phi) - 0.90649 * Math.sin(phi));
  const b = tg + a * (1.97294 * Math.cos(phi));
  return [clamp(r * 255), clamp(g * 255), clamp(b * 255)];
}

/** Perceived luminance (Rec.709) of an sRGB triple (0..255), for monotonicity plots. */
export function luma(rgb: RGB): number {
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}
export const rgbCss = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

// ---- ColorBrewer schemes (a representative set) ----
export const BREWER: Record<string, { type: string; colors: string[] }> = {
  Blues: { type: 'sequential', colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] },
  YlOrRd: { type: 'sequential', colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'] },
  RdYlBu: { type: 'diverging', colors: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4'] },
  BrBG: { type: 'diverging', colors: ['#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e'] },
  Set2: { type: 'qualitative', colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'] },
  Dark2: { type: 'qualitative', colors: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'] },
};
