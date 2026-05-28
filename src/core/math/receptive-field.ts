/*
 * Centre-surround receptive-field maths: Difference-of-Gaussians (DoG) kernels
 * and 1-D lateral-inhibition convolution.
 * Sources: Wandell, Foundations of Vision §5; Hubel, Eye Brain and Vision §5.
 *
 * A retinal ganglion cell's receptive field is modelled as a narrow excitatory
 * centre minus a broad inhibitory surround — the DoG. Convolving a luminance
 * profile with a zero-sum DoG reproduces edge enhancement (Mach bands), the
 * scalloping of uniform steps (Chevreul), and Cornsweet filling-in.
 */

/** Unit-area 1-D Gaussian. */
export function gaussian(x: number, sigma: number): number {
  return Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Difference-of-Gaussians at offset x: narrow centre (sigC) minus broad
 * surround (sigS), each unit-area. kSurround scales surround strength.
 */
export function dog(x: number, sigC: number, sigS: number, kSurround = 1): number {
  return gaussian(x, sigC) - kSurround * gaussian(x, sigS);
}

/**
 * Discrete zero-sum DoG kernel of (2*size+1) taps. Subtracting the DC term
 * makes a uniform field give zero response — the filter sees only contrast.
 */
export function dogKernel(sigC: number, sigS: number, size: number, kSurround = 1): Float32Array {
  const k = new Float32Array(2 * size + 1);
  let sum = 0;
  for (let i = -size; i <= size; i++) {
    const v = dog(i, sigC, sigS, kSurround);
    k[i + size] = v;
    sum += v;
  }
  const mean = sum / k.length;
  for (let i = 0; i < k.length; i++) k[i] -= mean;
  return k;
}

/**
 * Edge-clamped 1-D convolution returning the "perceived" signal: the raw
 * profile plus the edge-enhancing surround contribution (gain-scaled). A flat
 * input returns itself; steps gain Mach-style overshoot and undershoot.
 */
export function perceive(profile: ArrayLike<number>, kernel: Float32Array, gain = 1): Float32Array {
  const n = profile.length, half = (kernel.length - 1) / 2;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = -half; j <= half; j++) {
      const idx = Math.min(n - 1, Math.max(0, i + j));
      acc += profile[idx] * kernel[j + half];
    }
    out[i] = profile[i] + gain * acc;
  }
  return out;
}
