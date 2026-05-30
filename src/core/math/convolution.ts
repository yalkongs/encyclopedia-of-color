/** Convolution / filter infrastructure shared by 6.7 modules. Single-channel grayscale. */

export interface ImageF32 {
  w: number;
  h: number;
  data: Float32Array; // length = w*h, values 0..1
}

/** Create a synthetic 64x64 grayscale test image: gradient + a checker patch + step edges + a circle. */
export function syntheticTestImage(): ImageF32 {
  const w = 96, h = 64;
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0.5;
    // Top-left: horizontal gradient
    if (x < 32 && y < 32) v = x / 32;
    // Top-right: checkerboard
    else if (x >= 32 && x < 64 && y < 32) v = (((x >> 2) + (y >> 2)) & 1) ? 0.85 : 0.15;
    // Right: vertical step
    else if (x >= 64 && y < 32) v = x < 80 ? 0.9 : 0.1;
    // Bottom-left: circle
    else if (x < 32 && y >= 32) {
      const dx = x - 16, dy = y - 48;
      v = Math.sqrt(dx * dx + dy * dy) < 12 ? 0.85 : 0.15;
    }
    // Bottom-middle: noise
    else if (x >= 32 && x < 64 && y >= 32) {
      v = 0.5 + (Math.sin(x * 0.7 + y * 1.3) + Math.sin(x * 2.1 - y * 0.9)) * 0.15;
    }
    // Bottom-right: thin lines
    else {
      v = (Math.floor(x / 3) + Math.floor(y / 7)) % 2 ? 0.9 : 0.2;
    }
    d[y * w + x] = Math.max(0, Math.min(1, v));
  }
  return { w, h, data: d };
}

export function clone(img: ImageF32): ImageF32 {
  return { w: img.w, h: img.h, data: new Float32Array(img.data) };
}

/** 2D convolution with zero-padded boundary. Kernel is row-major, size kSize × kSize. */
export function convolve2D(img: ImageF32, kernel: Float32Array, kSize: number): ImageF32 {
  const out = new Float32Array(img.w * img.h);
  const r = Math.floor(kSize / 2);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      let acc = 0;
      for (let ky = 0; ky < kSize; ky++) {
        const yy = y + ky - r;
        if (yy < 0 || yy >= img.h) continue;
        for (let kx = 0; kx < kSize; kx++) {
          const xx = x + kx - r;
          if (xx < 0 || xx >= img.w) continue;
          acc += img.data[yy * img.w + xx] * kernel[ky * kSize + kx];
        }
      }
      out[y * img.w + x] = acc;
    }
  }
  return { w: img.w, h: img.h, data: out };
}

export function gaussianKernel(sigma: number, kSize?: number): { kernel: Float32Array; size: number } {
  const size = kSize ?? Math.max(3, 2 * Math.ceil(sigma * 3) + 1);
  const r = Math.floor(size / 2);
  const k = new Float32Array(size * size);
  let sum = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - r, dy = y - r;
    const v = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    k[y * size + x] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return { kernel: k, size };
}

export function boxKernel(size: number): Float32Array {
  const k = new Float32Array(size * size);
  k.fill(1 / (size * size));
  return k;
}

/** Sobel kernels return horizontal and vertical gradients separately. */
export function sobelX(): { kernel: Float32Array; size: number } {
  return { kernel: new Float32Array([-1, 0, 1, -2, 0, 2, -1, 0, 1]), size: 3 };
}
export function sobelY(): { kernel: Float32Array; size: number } {
  return { kernel: new Float32Array([-1, -2, -1, 0, 0, 0, 1, 2, 1]), size: 3 };
}

/** Compute gradient magnitude with Sobel. Returned values may exceed 1 — caller may normalise. */
export function sobelMagnitude(img: ImageF32): ImageF32 {
  const gx = convolve2D(img, sobelX().kernel, 3);
  const gy = convolve2D(img, sobelY().kernel, 3);
  const out = new Float32Array(img.w * img.h);
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.sqrt(gx.data[i] * gx.data[i] + gy.data[i] * gy.data[i]);
  }
  return { w: img.w, h: img.h, data: out };
}

/** Laplacian-of-Gaussian kernel (Marr). */
export function logKernel(sigma: number, kSize?: number): { kernel: Float32Array; size: number } {
  const size = kSize ?? Math.max(5, 2 * Math.ceil(sigma * 3) + 1);
  const r = Math.floor(size / 2);
  const k = new Float32Array(size * size);
  const s2 = sigma * sigma, s4 = s2 * s2;
  let sumAbs = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - r, dy = y - r, rr = dx * dx + dy * dy;
    const v = -(1 - rr / (2 * s2)) * Math.exp(-rr / (2 * s2)) / (Math.PI * s4);
    k[y * size + x] = v;
    sumAbs += Math.abs(v);
  }
  // Normalise so |sum| ≈ 1 for visual coherence
  for (let i = 0; i < k.length; i++) k[i] /= (sumAbs / 4);
  return { kernel: k, size };
}

/** Unsharp mask: out = img + amount * (img - gaussianBlur(img)). */
export function unsharpMask(img: ImageF32, sigma: number, amount: number): ImageF32 {
  const g = gaussianKernel(sigma);
  const blurred = convolve2D(img, g.kernel, g.size);
  const out = new Float32Array(img.w * img.h);
  for (let i = 0; i < out.length; i++) {
    const detail = img.data[i] - blurred.data[i];
    out[i] = Math.max(0, Math.min(1, img.data[i] + amount * detail));
  }
  return { w: img.w, h: img.h, data: out };
}

/** Bilateral filter — spatial Gaussian × intensity Gaussian. */
export function bilateral(img: ImageF32, sigmaS: number, sigmaR: number): ImageF32 {
  const size = Math.max(3, 2 * Math.ceil(sigmaS * 2) + 1);
  const r = Math.floor(size / 2);
  const out = new Float32Array(img.w * img.h);
  const s2 = 2 * sigmaS * sigmaS, r2 = 2 * sigmaR * sigmaR;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const I0 = img.data[y * img.w + x];
      let acc = 0, wsum = 0;
      for (let ky = -r; ky <= r; ky++) {
        const yy = y + ky;
        if (yy < 0 || yy >= img.h) continue;
        for (let kx = -r; kx <= r; kx++) {
          const xx = x + kx;
          if (xx < 0 || xx >= img.w) continue;
          const I1 = img.data[yy * img.w + xx];
          const wS = Math.exp(-(kx * kx + ky * ky) / s2);
          const wR = Math.exp(-((I1 - I0) * (I1 - I0)) / r2);
          const wW = wS * wR;
          acc += I1 * wW;
          wsum += wW;
        }
      }
      out[y * img.w + x] = wsum > 0 ? acc / wsum : I0;
    }
  }
  return { w: img.w, h: img.h, data: out };
}

/** Render an ImageF32 to a canvas at (x, y) with optional scale and abs-value mapping. */
export function drawImage(
  g: CanvasRenderingContext2D,
  img: ImageF32,
  x: number, y: number, scale = 4,
  opts: { abs?: boolean; gain?: number } = {},
): void {
  const abs = opts.abs ?? false;
  const gain = opts.gain ?? 1;
  const id = g.createImageData(img.w * scale, img.h * scale);
  for (let py = 0; py < img.h; py++) {
    for (let px = 0; px < img.w; px++) {
      let v = img.data[py * img.w + px] * gain;
      if (abs) v = Math.abs(v);
      v = Math.max(0, Math.min(1, v));
      const ch = Math.round(v * 255);
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const off = ((py * scale + dy) * img.w * scale + (px * scale + dx)) * 4;
        id.data[off] = ch;
        id.data[off + 1] = ch;
        id.data[off + 2] = ch;
        id.data[off + 3] = 255;
      }
    }
  }
  g.putImageData(id, x, y);
}
