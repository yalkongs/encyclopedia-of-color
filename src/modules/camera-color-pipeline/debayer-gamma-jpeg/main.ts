import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Camera native → sRGB-like display matrix (a generic "color matrix" stage)
const M_CAM_TO_DISP = [
  [ 1.5, -0.4, -0.1],
  [-0.2,  1.3, -0.1],
  [ 0.0, -0.3,  1.3],
];
const WB_GAIN: [number, number, number] = [1.85, 1.0, 1.30]; // R+, B+ to neutralize a warm scene

function applyM(M: number[][], v: [number, number, number]): [number, number, number] {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}
function applyGain(v: [number, number, number], g: [number, number, number]): [number, number, number] {
  return [v[0] * g[0], v[1] * g[1], v[2] * g[2]];
}
function clamp01(v: [number, number, number]): [number, number, number] {
  return [Math.max(0, Math.min(1, v[0])), Math.max(0, Math.min(1, v[1])), Math.max(0, Math.min(1, v[2]))];
}
function gammaEncode(v: [number, number, number], gamma = 1 / 2.2): [number, number, number] {
  const c = clamp01(v);
  return [Math.pow(c[0], gamma), Math.pow(c[1], gamma), Math.pow(c[2], gamma)];
}
function quantize8(v: [number, number, number]): [number, number, number] {
  const c = clamp01(v);
  return [Math.round(c[0] * 255) / 255, Math.round(c[1] * 255) / 255, Math.round(c[2] * 255) / 255];
}

function hueToRGB(h: number): [number, number, number] {
  const c = 0.6, hp = (h % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = 0.5 - c;
  return [r + m, g + m, b + m];
}

class PipelineOrder {
  private stage: CanvasStage;
  private exposure = 0;
  private hue = 40;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.exposure = hydrateNumber('exposure', 0);
    this.hue = hydrateNumber('hue', 40);

    const sE = document.getElementById('exposure') as EncSlider;
    sE.value = this.exposure;
    sE.addEventListener('input', (e) => { this.exposure = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    const sH = document.getElementById('hue') as EncSlider;
    sH.value = this.hue;
    sH.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    registerStateParam('exposure', () => Math.round(this.exposure));
    registerStateParam('hue', () => Math.round(this.hue));

    document.addEventListener('reset-params', () => {
      this.exposure = 0; this.hue = 40; sE.value = 0; sH.value = 40;
      this.draw(); notifyStateChange();
    });
  }

  // raw camera linear value
  private raw(): [number, number, number] {
    const linear = hueToRGB(this.hue);
    const k = Math.pow(2, this.exposure);
    // Inject warm cast — divide by WB gain so the *corrected* output is correct
    return [linear[0] * k / WB_GAIN[0], linear[1] * k / WB_GAIN[1], linear[2] * k / WB_GAIN[2]];
  }

  private orderA(): { steps: { label: string; v: [number, number, number] }[]; final: [number, number, number] } {
    let v = this.raw();
    const steps: { label: string; v: [number, number, number] }[] = [];
    steps.push({ label: '(RAW)', v });
    v = applyGain(v, WB_GAIN); steps.push({ label: '× WB gain (linear)', v });
    // demosaic is identity at single-patch granularity — labeled
    steps.push({ label: '+ demosaic (identity here)', v });
    v = applyM(M_CAM_TO_DISP, v); steps.push({ label: '× color matrix', v });
    v = gammaEncode(v); steps.push({ label: 'γ encode (1/2.2)', v });
    v = quantize8(v); steps.push({ label: 'quantise 8-bit', v });
    return { steps, final: v };
  }

  private orderB(): { steps: { label: string; v: [number, number, number] }[]; final: [number, number, number] } {
    let v = this.raw();
    const steps: { label: string; v: [number, number, number] }[] = [];
    steps.push({ label: '(RAW)', v });
    steps.push({ label: '+ demosaic (identity here)', v });
    v = gammaEncode(v); steps.push({ label: 'γ encode (1/2.2) — before matrix', v });
    v = applyM(M_CAM_TO_DISP, v); steps.push({ label: '× color matrix on NON-linear', v });
    v = applyGain(v, WB_GAIN); steps.push({ label: '× WB gain (post-gamma)', v });
    v = quantize8(v); steps.push({ label: 'quantise 8-bit', v });
    return { steps, final: v };
  }

  private cssFromLin(v: [number, number, number]): string {
    const enc = gammaEncode(v);
    return `rgb(${Math.round(enc[0] * 255)},${Math.round(enc[1] * 255)},${Math.round(enc[2] * 255)})`;
  }
  private cssFromEnc(v: [number, number, number]): string {
    const c = clamp01(v);
    return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const colW = (w - 3 * M) / 2;
    const a = this.orderA();
    const b = this.orderB();

    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('Order A — canonical: WB → demosaic → matrix → γ → 8-bit', M, M);
    g.fillText('Order B — swapped: demosaic → γ → matrix → WB → 8-bit', M + colW + M, M);

    // Trace rows
    const rowY = M + 16;
    const rowH = 30;
    const drawTrace = (steps: { label: string; v: [number, number, number] }[], x0: number) => {
      for (let i = 0; i < steps.length; i++) {
        const y = rowY + i * rowH;
        const sw = 26;
        const css = (steps[i].label.includes('γ') || steps[i].label.includes('quant')) ? this.cssFromEnc(steps[i].v) : this.cssFromLin(steps[i].v);
        g.fillStyle = css;
        g.fillRect(x0, y, sw, sw - 4);
        g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1; g.strokeRect(x0, y, sw, sw - 4);
        g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
        g.fillText(steps[i].label, x0 + sw + 8, y + 14);
        g.fillStyle = theme.inkAlpha(0.7); g.font = '10px monospace';
        g.fillText(`(${steps[i].v[0].toFixed(2)}, ${steps[i].v[1].toFixed(2)}, ${steps[i].v[2].toFixed(2)})`, x0 + sw + 8, y + 24);
      }
    };
    drawTrace(a.steps, M);
    drawTrace(b.steps, M + colW + M);

    // Final swatches side by side at bottom
    const finalY = rowY + 6 * rowH + 30;
    g.fillStyle = theme.crimson; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText('Final 8-bit pixel:', M, finalY);
    const swSize = 50;
    g.fillStyle = this.cssFromEnc(a.final);
    g.fillRect(M, finalY + 8, swSize, swSize);
    g.strokeStyle = theme.ink; g.strokeRect(M, finalY + 8, swSize, swSize);
    g.fillStyle = this.cssFromEnc(b.final);
    g.fillRect(M + swSize + 14, finalY + 8, swSize, swSize);
    g.strokeRect(M + swSize + 14, finalY + 8, swSize, swSize);

    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Order A', M + swSize / 2, finalY + swSize + 24);
    g.fillText('Order B', M + swSize + 14 + swSize / 2, finalY + swSize + 24);

    // Diff
    const dr = (a.final[0] - b.final[0]) * 255;
    const dg = (a.final[1] - b.final[1]) * 255;
    const db = (a.final[2] - b.final[2]) * 255;
    const dE = Math.sqrt(dr * dr + dg * dg + db * db);
    g.fillStyle = theme.crimson; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`RGB distance A vs B: ${dE.toFixed(1)} / 255`, M + 2 * swSize + 60, finalY + 24);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(`ΔR ${dr.toFixed(0)}   ΔG ${dg.toFixed(0)}   ΔB ${db.toFixed(0)}`, M + 2 * swSize + 60, finalY + 42);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif';
    g.fillText('Gamma and matrix do not commute — applying the matrix after γ-encoding distorts the hue and saturation.', M, finalY + swSize + 50);
  }
}

new PipelineOrder();
