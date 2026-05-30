/** Dithering helpers shared by 6.9 modules. Operate on Float32 single-channel images 0..1. */

import type { ImageF32 } from './convolution';

/** Quantise a grayscale image to nLevels (uniform) WITHOUT dithering. */
export function quantize(img: ImageF32, levels: number): ImageF32 {
  const out = new Float32Array(img.data.length);
  for (let i = 0; i < img.data.length; i++) {
    const q = Math.round(img.data[i] * (levels - 1)) / (levels - 1);
    out[i] = q;
  }
  return { w: img.w, h: img.h, data: out };
}

/** Floyd-Steinberg dithering — 4-neighbour error diffusion. */
export function floydSteinberg(img: ImageF32, levels: number): ImageF32 {
  const buf = new Float32Array(img.data);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      const old = buf[i];
      const q = Math.round(old * (levels - 1)) / (levels - 1);
      buf[i] = q;
      const err = old - q;
      // Distribute: 7/16 right, 3/16 below-left, 5/16 below, 1/16 below-right
      if (x + 1 < img.w) buf[i + 1] += err * 7 / 16;
      if (y + 1 < img.h) {
        if (x > 0) buf[i + img.w - 1] += err * 3 / 16;
        buf[i + img.w] += err * 5 / 16;
        if (x + 1 < img.w) buf[i + img.w + 1] += err * 1 / 16;
      }
    }
  }
  return { w: img.w, h: img.h, data: buf };
}

/** Atkinson dithering — 6-cell error diffusion with only 6/8 of error spread (Bill Atkinson, Mac 1984). */
export function atkinson(img: ImageF32, levels: number): ImageF32 {
  const buf = new Float32Array(img.data);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      const old = buf[i];
      const q = Math.round(old * (levels - 1)) / (levels - 1);
      buf[i] = q;
      const err = (old - q) / 8;
      if (x + 1 < img.w) buf[i + 1] += err;
      if (x + 2 < img.w) buf[i + 2] += err;
      if (y + 1 < img.h) {
        if (x > 0) buf[i + img.w - 1] += err;
        buf[i + img.w] += err;
        if (x + 1 < img.w) buf[i + img.w + 1] += err;
      }
      if (y + 2 < img.h) buf[i + 2 * img.w] += err;
    }
  }
  return { w: img.w, h: img.h, data: buf };
}

/** Bayer ordered dithering with 4x4 or 8x8 matrix. */
export function bayerOrdered(img: ImageF32, levels: number, size: 4 | 8 = 4): ImageF32 {
  const bayer4 = [
    0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5,
  ];
  const bayer8 = [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21,
  ];
  const m = size === 4 ? bayer4 : bayer8;
  const denom = size === 4 ? 16 : 64;
  const out = new Float32Array(img.data.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const threshold = (m[(y % size) * size + (x % size)] + 0.5) / denom - 0.5;
    const v = img.data[y * img.w + x] + threshold / levels;
    const q = Math.round(v * (levels - 1)) / (levels - 1);
    out[y * img.w + x] = Math.max(0, Math.min(1, q));
  }
  return { w: img.w, h: img.h, data: out };
}

/** Approximate blue-noise dither using a Mitchell-style void-and-cluster shortcut: precomputed mask via random init + small Gaussian-energy minimisation. */
export function blueNoiseMask(size: number, seed = 1): Float32Array {
  // Deterministic LCG so the mask is stable across reloads
  let state = seed >>> 0;
  const rng = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const N = size * size;
  // Random init
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = rng();
  // Iteratively swap pairs to reduce low-frequency content (simple proxy)
  const blur = (im: Float32Array) => {
    const out = new Float32Array(N);
    const k = 2;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0, c = 0;
      for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) {
        const xx = (x + dx + size) % size, yy = (y + dy + size) % size;
        s += im[yy * size + xx]; c++;
      }
      out[y * size + x] = s / c;
    }
    return out;
  };
  for (let it = 0; it < 8; it++) {
    const b = blur(m);
    // Swap pair: the brightest in blur with the darkest in blur swap their m values
    let maxI = 0, minI = 0;
    for (let i = 0; i < N; i++) {
      if (b[i] > b[maxI]) maxI = i;
      if (b[i] < b[minI]) minI = i;
    }
    const tmp = m[maxI]; m[maxI] = m[minI]; m[minI] = tmp;
  }
  return m;
}

export function blueNoiseDither(img: ImageF32, levels: number, mask: Float32Array, maskSize: number): ImageF32 {
  const out = new Float32Array(img.data.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const t = mask[(y % maskSize) * maskSize + (x % maskSize)] - 0.5;
    const v = img.data[y * img.w + x] + t / levels;
    const q = Math.round(v * (levels - 1)) / (levels - 1);
    out[y * img.w + x] = Math.max(0, Math.min(1, q));
  }
  return { w: img.w, h: img.h, data: out };
}

/** Build a smooth-gradient image (good for dither demos). */
export function gradientImage(w = 96, h = 64): ImageF32 {
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // Vertical bands of horizontal gradients with thin vertical stops
    const t = x / w;
    let v = t;
    if (y > h * 0.6 && y < h * 0.7) v = 0.5;
    d[y * w + x] = v;
  }
  return { w, h, data: d };
}
