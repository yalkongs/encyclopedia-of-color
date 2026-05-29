/*
 * APCA — Accessible Perceptual Contrast Algorithm (SAPC), the WCAG 3 draft
 * contrast method by Andrew Somers. Constants from Myndex/apca-w3 (W3 0.1.9).
 * Verified: #000 on #fff → Lc ≈ 106.04; #fff on #000 → Lc ≈ -107.88.
 *
 * Lc is a signed lightness contrast in roughly ±108; positive = dark text on
 * light background, negative = light text on dark background. Report |Lc|.
 */

const sRco = 0.2126729, sGco = 0.7151522, sBco = 0.0721750;
const mainTRC = 2.4;
const normBG = 0.56, normTXT = 0.57, revTXT = 0.62, revBG = 0.65;
const blkThrs = 0.022, blkClmp = 1.414;
const scaleBoW = 1.14, scaleWoB = 1.14;
const loBoWoffset = 0.027, loWoBoffset = 0.027;
const deltaYmin = 0.0005, loClip = 0.1;

/** Parse #rgb / #rrggbb to [r,g,b] in 0..255. */
export function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Screen luminance Y from an sRGB triple (0..255) using APCA's simple 2.4 TRC. */
export function apcaY(rgb: [number, number, number]): number {
  const lin = (c: number) => Math.pow(c / 255, mainTRC);
  return sRco * lin(rgb[0]) + sGco * lin(rgb[1]) + sBco * lin(rgb[2]);
}

function softClamp(Y: number): number {
  return Y > blkThrs ? Y : Y + Math.pow(blkThrs - Y, blkClmp);
}

/** APCA Lc for text over background, each an sRGB triple (0..255). Signed. */
export function apcaContrast(txt: [number, number, number], bg: [number, number, number]): number {
  const txtY = softClamp(apcaY(txt));
  const bgY = softClamp(apcaY(bg));
  if (Math.abs(bgY - txtY) < deltaYmin) return 0;

  let out: number;
  if (bgY > txtY) {
    const SAPC = (Math.pow(bgY, normBG) - Math.pow(txtY, normTXT)) * scaleBoW;
    out = SAPC < loClip ? 0 : SAPC - loBoWoffset;
  } else {
    const SAPC = (Math.pow(bgY, revBG) - Math.pow(txtY, revTXT)) * scaleWoB;
    out = SAPC > -loClip ? 0 : SAPC + loWoBoffset;
  }
  return out * 100;
}

/** Convenience: APCA Lc from two hex colours (text, background). Signed. */
export function apcaLcHex(txtHex: string, bgHex: string): number {
  return apcaContrast(parseHex(txtHex), parseHex(bgHex));
}

/** WCAG 2.x relative luminance (piecewise sRGB) from an sRGB triple (0..255). */
export function wcagLuminance(rgb: [number, number, number]): number {
  const lin = (c8: number) => { const c = c8 / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** WCAG 2.x contrast ratio (1..21) between two sRGB triples. */
export function wcagRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = wcagLuminance(a), lb = wcagLuminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
