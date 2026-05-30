import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Mode = 'paste' | 'gain' | 'multi-band';
const MODES: Mode[] = ['paste', 'gain', 'multi-band'];

// Generate two frames covering a panorama horizon
// Frame A covers x in [0..0.6], Frame B covers x in [0.4..1.0], overlap is [0.4..0.6]
function scenePixel(u: number, v: number): [number, number, number] {
  // Sky gradient + mountains + foreground
  let r = 80 + (1 - v) * 120;       // sky top blue → bright bottom
  let g = 110 + (1 - v) * 110;
  let b = 200 - v * 60;
  // Mountains
  const mountain = 0.55 - 0.10 * Math.sin(u * 12) - 0.07 * Math.sin(u * 23 + 1);
  if (v > mountain) {
    r = 80 + Math.sin(u * 30) * 20;
    g = 100 + Math.cos(u * 25) * 15;
    b = 70;
  }
  if (v > 0.78) {
    // Ground
    const t = (v - 0.78) / 0.22;
    r = 90 + t * 60; g = 80 + t * 60; b = 50 + t * 20;
  }
  return [r, g, b];
}

const EXPOSURE_A = 1.0;
const EXPOSURE_B = 1.45;  // frame B is overexposed

class PanoStitch {
  private stage: CanvasStage;
  private mode: Mode = 'paste';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('mode');
    if (raw && (MODES as string[]).includes(raw)) this.mode = raw as Mode;
    const t = document.getElementById('mode') as EncToggle; t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value as Mode; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.mode = 'paste'; t.value = 'paste'; this.draw(); notifyStateChange(); });
  }

  // Render the stitched panorama at a target size
  private renderPanorama(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, mode: Mode) {
    const W = Math.floor(w), H = Math.floor(h);
    const img = g.createImageData(W, H);
    // Frame A: 0..0.6, Frame B: 0.4..1.0, overlap 0.4..0.6
    const ovStart = 0.40, ovEnd = 0.60;

    // For gain mode: compute overlap-region average ratio to compensate frame B
    let gainCorrection = 1;
    if (mode === 'gain' || mode === 'multi-band') {
      // Sample mid-overlap average
      let sumA = 0, sumB = 0, n = 0;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
        const u = x / W;
        if (u >= ovStart && u <= ovEnd) {
          const [rA, gA, bA] = scenePixel(u, y / H);
          const [rB, gB, bB] = scenePixel(u, y / H);
          const lumA = 0.21 * rA + 0.72 * gA + 0.07 * bA;
          const lumB = 0.21 * rB * EXPOSURE_B + 0.72 * gB * EXPOSURE_B + 0.07 * bB * EXPOSURE_B;
          sumA += lumA * EXPOSURE_A; sumB += lumB; n++;
        }
      }
      gainCorrection = sumA / sumB;
    }
    const expB_used = EXPOSURE_B * (mode === 'gain' || mode === 'multi-band' ? gainCorrection : 1);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W; const v = y / H;
        const [r, g0, b] = scenePixel(u, v);
        let R = 0, G = 0, B = 0;
        if (u < ovStart) {
          // Only frame A visible
          R = r * EXPOSURE_A; G = g0 * EXPOSURE_A; B = b * EXPOSURE_A;
        } else if (u > ovEnd) {
          // Only frame B visible (post-correction)
          R = r * expB_used; G = g0 * expB_used; B = b * expB_used;
        } else {
          // Overlap region
          const t = (u - ovStart) / (ovEnd - ovStart);
          if (mode === 'paste') {
            // Hard seam at midpoint
            if (t < 0.5) { R = r * EXPOSURE_A; G = g0 * EXPOSURE_A; B = b * EXPOSURE_A; }
            else { R = r * EXPOSURE_B; G = g0 * EXPOSURE_B; B = b * EXPOSURE_B; }
          } else if (mode === 'gain') {
            // Hard seam at midpoint, but B is gain-corrected
            if (t < 0.5) { R = r * EXPOSURE_A; G = g0 * EXPOSURE_A; B = b * EXPOSURE_A; }
            else { R = r * expB_used; G = g0 * expB_used; B = b * expB_used; }
          } else {
            // multi-band: feather + gain correction
            const smoothT = t * t * (3 - 2 * t);
            const wA = 1 - smoothT;
            const wB = smoothT;
            R = (r * EXPOSURE_A) * wA + (r * expB_used) * wB;
            G = (g0 * EXPOSURE_A) * wA + (g0 * expB_used) * wB;
            B = (b * EXPOSURE_A) * wA + (b * expB_used) * wB;
          }
        }
        const idx = (y * W + x) * 4;
        img.data[idx] = Math.min(255, Math.max(0, R));
        img.data[idx + 1] = Math.min(255, Math.max(0, G));
        img.data[idx + 2] = Math.min(255, Math.max(0, B));
        img.data[idx + 3] = 255;
      }
    }
    g.putImageData(img, x0, y0);
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(x0, y0, w, h);

    // Mark the overlap region
    g.strokeStyle = theme.gold; g.lineWidth = 1; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(x0 + w * ovStart, y0); g.lineTo(x0 + w * ovStart, y0 + h); g.stroke();
    g.beginPath(); g.moveTo(x0 + w * ovEnd, y0); g.lineTo(x0 + w * ovEnd, y0 + h); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.gold; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('overlap region', x0 + w * (ovStart + ovEnd) / 2, y0 + 12);
  }

  // Render an individual source frame
  private renderFrame(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, exposure: number) {
    const W = Math.floor(w), H = Math.floor(h);
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W; const v = y / H;
        const [r, gv, b] = scenePixel(u, v);
        const idx = (y * W + x) * 4;
        img.data[idx] = Math.min(255, r * exposure);
        img.data[idx + 1] = Math.min(255, gv * exposure);
        img.data[idx + 2] = Math.min(255, b * exposure);
        img.data[idx + 3] = 255;
      }
    }
    g.putImageData(img, x0, y0);
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(x0, y0, w, h);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 28;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('two source frames', M, M + 10);

    const frameW = (w - 3 * M) / 2;
    const frameH = 120;
    this.renderFrame(g, M, M + 20, frameW, frameH, EXPOSURE_A);
    this.renderFrame(g, M * 2 + frameW, M + 20, frameW, frameH, EXPOSURE_B);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`frame A · exposure ×${EXPOSURE_A.toFixed(2)}`, M + frameW / 2, M + 20 + frameH + 14);
    g.fillText(`frame B · exposure ×${EXPOSURE_B.toFixed(2)} (overexposed)`, M * 2 + frameW + frameW / 2, M + 20 + frameH + 14);

    // Stitched panorama
    const py = M + 20 + frameH + 40;
    const pw = w - 2 * M;
    const ph = h - py - M - 50;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`stitched panorama · mode = ${this.mode}`, M, py - 6);
    this.renderPanorama(g, M, py, pw, ph, this.mode);

    // Annotation
    const ny = py + ph + 22;
    g.fillStyle = theme.crimson; g.font = '12px serif';
    const note = this.mode === 'paste'
      ? 'paste: hard seam — visible vertical band where exposures meet'
      : this.mode === 'gain'
      ? 'gain: B globally rescaled to match A in the overlap — seam is much fainter but still detectable on edges'
      : 'multi-band: gain correction + feathered overlap blend → seam essentially invisible';
    g.fillText(note, M, ny);
  }
}

new PanoStitch();
