/** Color-quantization helpers shared by 6.8 modules. RGB in 0..255. */

export interface RGB { r: number; g: number; b: number; }

/** Build a synthetic 64×48 image with smooth gradients + colour patches for quantization demos. */
export function syntheticRGBImage(): { w: number; h: number; data: Uint8ClampedArray } {
  const w = 96, h = 64;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    if (y < 16) {
      // hue strip
      const hue = (x / w) * 360;
      [r, g, b] = hsvToRgb(hue, 0.85, 0.95);
    } else if (y < 32) {
      // value gradient
      const v = (x / w);
      r = g = b = Math.round(v * 255);
    } else if (y < 48) {
      // patch grid
      const px = Math.floor(x / 12), py = Math.floor((y - 32) / 8);
      const palette: [number, number, number][] = [
        [196, 56, 60], [212, 132, 56], [56, 132, 56], [56, 100, 200],
        [140, 60, 180], [200, 60, 140], [80, 80, 96], [40, 40, 56],
      ];
      const c = palette[(px + py * 8) % palette.length];
      r = c[0]; g = c[1]; b = c[2];
    } else {
      // sky-to-sand band
      const t = (x / w);
      r = Math.round(80 + 160 * t); g = Math.round(140 + 90 * t); b = Math.round(220 - 100 * t);
    }
    const off = (y * w + x) * 4;
    d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = 255;
  }
  return { w, h, data: d };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [Math.round((rp + m) * 255), Math.round((gp + m) * 255), Math.round((bp + m) * 255)];
}

/** Uniform quantisation: reduce each channel to nLevels per channel. */
export function uniformQuantize(img: { w: number; h: number; data: Uint8ClampedArray }, levels: number): { w: number; h: number; data: Uint8ClampedArray; palette: RGB[] } {
  const out = new Uint8ClampedArray(img.data.length);
  const step = 256 / levels;
  const paletteSet = new Set<number>();
  for (let i = 0; i < img.data.length; i += 4) {
    const r = Math.min(255, Math.floor(img.data[i] / step) * step + step / 2);
    const g = Math.min(255, Math.floor(img.data[i + 1] / step) * step + step / 2);
    const b = Math.min(255, Math.floor(img.data[i + 2] / step) * step + step / 2);
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    paletteSet.add((r << 16) | (g << 8) | b);
  }
  const palette: RGB[] = Array.from(paletteSet).map(v => ({ r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff }));
  return { w: img.w, h: img.h, data: out, palette };
}

/** Median-cut palette generation, then nearest-palette mapping. */
export function medianCutQuantize(img: { w: number; h: number; data: Uint8ClampedArray }, k: number): { w: number; h: number; data: Uint8ClampedArray; palette: RGB[] } {
  const pixels: RGB[] = [];
  for (let i = 0; i < img.data.length; i += 4) {
    pixels.push({ r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] });
  }
  let buckets: RGB[][] = [pixels];
  while (buckets.length < k) {
    // pick bucket with largest channel range
    let bestIdx = 0, bestRange = -1, bestAxis: 'r' | 'g' | 'b' = 'r';
    for (let bi = 0; bi < buckets.length; bi++) {
      const b = buckets[bi];
      if (b.length < 2) continue;
      let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
      for (const p of b) {
        if (p.r < rmin) rmin = p.r; if (p.r > rmax) rmax = p.r;
        if (p.g < gmin) gmin = p.g; if (p.g > gmax) gmax = p.g;
        if (p.b < bmin) bmin = p.b; if (p.b > bmax) bmax = p.b;
      }
      const ranges: { axis: 'r' | 'g' | 'b'; v: number }[] = [
        { axis: 'r', v: rmax - rmin }, { axis: 'g', v: gmax - gmin }, { axis: 'b', v: bmax - bmin },
      ];
      ranges.sort((a, b2) => b2.v - a.v);
      if (ranges[0].v > bestRange) { bestRange = ranges[0].v; bestIdx = bi; bestAxis = ranges[0].axis; }
    }
    const bucket = buckets[bestIdx];
    bucket.sort((a, b2) => a[bestAxis] - b2[bestAxis]);
    const mid = Math.floor(bucket.length / 2);
    const left = bucket.slice(0, mid), right = bucket.slice(mid);
    buckets.splice(bestIdx, 1, left, right);
  }
  // Mean of each bucket = palette colour
  const palette: RGB[] = buckets.map(b => {
    let r = 0, g = 0, bb = 0;
    for (const p of b) { r += p.r; g += p.g; bb += p.b; }
    return { r: Math.round(r / b.length), g: Math.round(g / b.length), b: Math.round(bb / b.length) };
  });
  // Map every pixel to nearest palette
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i + 1], bb = img.data[i + 2];
    let bestD = Infinity, best = palette[0];
    for (const p of palette) {
      const d = (r - p.r) ** 2 + (g - p.g) ** 2 + (bb - p.b) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    out[i] = best.r; out[i + 1] = best.g; out[i + 2] = best.b; out[i + 3] = 255;
  }
  return { w: img.w, h: img.h, data: out, palette };
}

/** Approximate Lab from sRGB (simple linear). */
export function srgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const rL = lin(r), gL = lin(g), bL = lin(b);
  // sRGB → XYZ (D65)
  const X = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const Y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const Z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;
  // XYZ → Lab
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b2 = 200 * (fy - fz);
  return [L, a, b2];
}

/** K-means in Lab with random init. Deterministic init order. */
export function kmeansLabQuantize(img: { w: number; h: number; data: Uint8ClampedArray }, k: number, iters = 6): { w: number; h: number; data: Uint8ClampedArray; palette: RGB[] } {
  const N = img.w * img.h;
  const labs = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [L, a, b2] = srgbToLab(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]);
    labs[i * 3] = L; labs[i * 3 + 1] = a; labs[i * 3 + 2] = b2;
  }
  // Deterministic init: pick k pixels evenly spaced
  const centers = new Float32Array(k * 3);
  for (let c = 0; c < k; c++) {
    const idx = Math.floor((c + 0.5) * N / k);
    centers[c * 3] = labs[idx * 3]; centers[c * 3 + 1] = labs[idx * 3 + 1]; centers[c * 3 + 2] = labs[idx * 3 + 2];
  }
  const assign = new Int32Array(N);
  for (let it = 0; it < iters; it++) {
    // assign
    for (let i = 0; i < N; i++) {
      let best = 0, bestD = Infinity;
      const L = labs[i * 3], a = labs[i * 3 + 1], b2 = labs[i * 3 + 2];
      for (let c = 0; c < k; c++) {
        const d = (L - centers[c * 3]) ** 2 + (a - centers[c * 3 + 1]) ** 2 + (b2 - centers[c * 3 + 2]) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      assign[i] = best;
    }
    // update
    const sums = new Float32Array(k * 3);
    const counts = new Int32Array(k);
    for (let i = 0; i < N; i++) {
      const c = assign[i];
      sums[c * 3] += labs[i * 3]; sums[c * 3 + 1] += labs[i * 3 + 1]; sums[c * 3 + 2] += labs[i * 3 + 2];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centers[c * 3] = sums[c * 3] / counts[c];
        centers[c * 3 + 1] = sums[c * 3 + 1] / counts[c];
        centers[c * 3 + 2] = sums[c * 3 + 2] / counts[c];
      }
    }
  }
  // For palette colours, find nearest-Lab pixel and use its RGB
  const palette: RGB[] = [];
  for (let c = 0; c < k; c++) {
    let bestI = 0, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const d = (labs[i * 3] - centers[c * 3]) ** 2 + (labs[i * 3 + 1] - centers[c * 3 + 1]) ** 2 + (labs[i * 3 + 2] - centers[c * 3 + 2]) ** 2;
      if (d < bestD) { bestD = d; bestI = i; }
    }
    palette.push({ r: img.data[bestI * 4], g: img.data[bestI * 4 + 1], b: img.data[bestI * 4 + 2] });
  }
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < N; i++) {
    const p = palette[assign[i]];
    out[i * 4] = p.r; out[i * 4 + 1] = p.g; out[i * 4 + 2] = p.b; out[i * 4 + 3] = 255;
  }
  return { w: img.w, h: img.h, data: out, palette };
}

/** Render a Uint8ClampedArray RGBA image onto context, scaled. */
export function drawRGB(g: CanvasRenderingContext2D, img: { w: number; h: number; data: Uint8ClampedArray }, x: number, y: number, scale = 4): void {
  const id = g.createImageData(img.w * scale, img.h * scale);
  for (let py = 0; py < img.h; py++) {
    for (let px = 0; px < img.w; px++) {
      const src = (py * img.w + px) * 4;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const dst = ((py * scale + dy) * img.w * scale + (px * scale + dx)) * 4;
        id.data[dst] = img.data[src];
        id.data[dst + 1] = img.data[src + 1];
        id.data[dst + 2] = img.data[src + 2];
        id.data[dst + 3] = 255;
      }
    }
  }
  g.putImageData(id, x, y);
}

export function drawPalette(g: CanvasRenderingContext2D, palette: RGB[], x: number, y: number, swatch = 18, maxCols = 16): void {
  for (let i = 0; i < palette.length; i++) {
    const cx = x + (i % maxCols) * swatch;
    const cy = y + Math.floor(i / maxCols) * swatch;
    g.fillStyle = `rgb(${palette[i].r},${palette[i].g},${palette[i].b})`;
    g.fillRect(cx, cy, swatch - 1, swatch - 1);
  }
}
