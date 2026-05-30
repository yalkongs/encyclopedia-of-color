import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Mode = 'spot' | 'center-weighted' | 'evaluative';
const MODES: Mode[] = ['spot', 'center-weighted', 'evaluative'];

// Scene model: WxH grid with luminance values 0..1
// Bright window dominates upper area; dark figure dominates centre-bottom
function sceneLum(W: number, H: number): Float32Array {
  const lum = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0.8; // wall (bright-ish)
      // Window behind figure
      if (x > W * 0.2 && x < W * 0.8 && y < H * 0.55) v = 0.97;
      // Figure silhouette (centre, slightly larger)
      const dx = x - W * 0.5, dy = y - H * 0.55;
      const inHead = (dx * dx) / Math.pow(W * 0.10, 2) + Math.pow((dy + H * 0.10) / (H * 0.10), 2) < 1;
      const inTorso = Math.abs(dx) < W * 0.17 && dy > -H * 0.05 && dy < H * 0.35;
      if (inHead || inTorso) v = 0.10;
      // Foreground (table)
      if (y > H * 0.85) v = 0.25;
      lum[y * W + x] = v;
    }
  }
  return lum;
}

// Compute target exposure (multiplier so target zone-V lands at 0.18)
function meterTarget(lum: Float32Array, W: number, H: number, mode: Mode): number {
  const total = W * H;
  let avg = 0;
  if (mode === 'spot') {
    // 3% radius centered at (0.5, 0.55) — landed on the face
    const cx = W * 0.5, cy = H * 0.40, r = Math.max(2, Math.min(W, H) * 0.04);
    let sum = 0, n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) { sum += lum[y * W + x]; n++; }
    }
    avg = n ? sum / n : 0.5;
  } else if (mode === 'center-weighted') {
    let sum = 0, wTot = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x / W) - 0.5, dy = (y / H) - 0.5;
      const w = Math.exp(-(dx * dx + dy * dy) / (2 * 0.15 * 0.15));
      sum += lum[y * W + x] * w; wTot += w;
    }
    avg = sum / wTot;
  } else {
    // evaluative: average
    let sum = 0;
    for (let i = 0; i < total; i++) sum += lum[i];
    avg = sum / total;
  }
  // Camera tries to put avg → 0.18
  return 0.18 / Math.max(0.01, avg);
}

class SpotEval {
  private stage: CanvasStage;
  private mode: Mode = 'spot';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('mode');
    if (raw && (MODES as string[]).includes(raw)) this.mode = raw as Mode;
    const t = document.getElementById('mode') as EncToggle; t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value as Mode; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.mode = 'spot'; t.value = 'spot'; this.draw(); notifyStateChange(); });
  }

  private renderScene(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mode: Mode, drawSampling: boolean) {
    const W = Math.floor(w), H = Math.floor(h);
    const lum = sceneLum(W, H);
    const mul = meterTarget(lum, W, H, mode);

    const img = g.createImageData(W, H);
    for (let i = 0; i < lum.length; i++) {
      const v = Math.min(1, Math.max(0, lum[i] * mul));
      // simple sRGB encoding
      const enc = Math.pow(v, 1 / 2.2);
      const px = Math.round(enc * 255);
      img.data[i * 4] = px;
      img.data[i * 4 + 1] = px;
      img.data[i * 4 + 2] = px;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, x, y);
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(x, y, w, h);

    if (drawSampling) {
      g.save();
      g.translate(x, y);
      if (mode === 'spot') {
        const cx = W * 0.5, cy = H * 0.40, r = Math.max(2, Math.min(W, H) * 0.04);
        g.strokeStyle = theme.crimson; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      } else if (mode === 'center-weighted') {
        g.strokeStyle = theme.crimson; g.lineWidth = 1;
        for (const rRel of [0.10, 0.20, 0.30, 0.40]) {
          g.beginPath(); g.ellipse(W / 2, H / 2, W * rRel, H * rRel, 0, 0, Math.PI * 2); g.stroke();
        }
      } else {
        // grid showing zones
        g.strokeStyle = theme.crimson; g.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
          g.beginPath(); g.moveTo(W * i / 5, 0); g.lineTo(W * i / 5, H); g.stroke();
          g.beginPath(); g.moveTo(0, H * i / 5); g.lineTo(W, H * i / 5); g.stroke();
        }
      }
      g.restore();
    }
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 28;
    // 3 panels side by side; the active mode gets a label highlight
    const colW = (w - 4 * M) / 3;
    const colH = (h - M - 80);

    const cy = M + 28;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'center';
    g.fillText('same backlit scene · each meter sees different luminance', w / 2, M + 12);

    const modes: Mode[] = ['spot', 'center-weighted', 'evaluative'];
    const labels = {
      'spot': 'Spot (1° centre on face)',
      'center-weighted': 'Centre-weighted (Gauss bias)',
      'evaluative': 'Evaluative (full average)',
    };
    for (let i = 0; i < 3; i++) {
      const x = M + i * (colW + M);
      const isActive = modes[i] === this.mode;
      g.fillStyle = isActive ? theme.crimson : theme.ink; g.font = '13px serif'; g.textAlign = 'center';
      g.fillText(labels[modes[i]], x + colW / 2, cy - 4);
      this.renderScene(g, x, cy, colW, colH, modes[i], true);
      if (isActive) {
        g.strokeStyle = theme.crimson; g.lineWidth = 3;
        g.strokeRect(x - 2, cy - 2, colW + 4, colH + 4);
      }
    }

    // Readout
    const ry = cy + colH + 30;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    const note = this.mode === 'spot'
      ? 'Spot meter locked on the figure → camera says "this is too dark, brighten it" → figure becomes mid-grey, window blows out.'
      : this.mode === 'center-weighted'
      ? 'Centre-weighted biases the middle, but still sees both figure and window → compromise exposure, figure dark, window slightly preserved.'
      : 'Evaluative averages everything → the bright window dominates the average → camera says "this is too bright" → figure becomes a silhouette.';
    g.fillStyle = theme.crimson;
    g.fillText(note, M, ry);
  }
}

new SpotEval();
