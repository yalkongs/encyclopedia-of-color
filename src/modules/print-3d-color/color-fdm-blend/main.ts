import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// filament colours A (top) and B (bottom)
const COL_A: [number, number, number] = [232, 80, 60];     // warm red
const COL_B: [number, number, number] = [50, 110, 200];    // cool blue

function rgb(c: [number, number, number]): string { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function blend(t: number): [number, number, number] { return [COL_A[0] * (1 - t) + COL_B[0] * t, COL_A[1] * (1 - t) + COL_B[1] * t, COL_A[2] * (1 - t) + COL_B[2] * t]; }

class FdmGradient {
  private stage: CanvasStage;
  private pitch = 5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pitch = hydrateNumber('pitch', 5);
    const s = document.getElementById('pitch') as EncSlider;
    s.value = this.pitch;
    s.addEventListener('input', (e) => { this.pitch = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pitch', () => Math.round(this.pitch));
    document.addEventListener('reset-params', () => { this.pitch = 5; s.value = 5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#1d1c19'; ctx.fillRect(0, 0, w, h);
    const pitch = Math.round(this.pitch);

    // part (left, taller box) — alternating colour layers in the chosen pitch
    const px0 = 60, py0 = 48, pw = Math.min(w * 0.42, 320), ph = h - 120;
    const layerH = 4; // mm-ish per layer in screen px
    const totalLayers = Math.floor(ph / layerH);
    let swaps = 0;
    let prevA = true;
    for (let i = 0; i < totalLayers; i++) {
      const y = py0 + (totalLayers - 1 - i) * layerH;
      const t = i / (totalLayers - 1);                    // 0 bottom (B), 1 top (A)
      // within each pitch-layer band the fraction of A-layers tracks the height — a real ratio gradient
      const useA = (i % pitch) < Math.round(t * pitch);
      const col = useA ? COL_A : COL_B;
      ctx.fillStyle = rgb(col); ctx.fillRect(px0, y, pw, layerH);
      if (useA !== prevA) swaps++;
      prevA = useA;
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(px0, py0, pw, ph);
    ctx.fillStyle = '#e3def0'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`printed part (${pitch}-layer pitch)`, px0 + pw / 2, py0 - 12);

    // perceived blend (right of part) — small "from a distance" preview using true linear interpolation
    const bx0 = px0 + pw + 30, bw = 80;
    for (let i = 0; i < totalLayers; i++) {
      const y = py0 + (totalLayers - 1 - i) * layerH;
      ctx.fillStyle = rgb(blend(i / (totalLayers - 1)));
      ctx.fillRect(bx0, y, bw, layerH);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(bx0, py0, bw, ph);
    ctx.fillStyle = '#e3def0'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('seen from afar', bx0 + bw / 2, py0 - 12);

    // purge tower (far right) — grows with the number of swaps
    const tx0 = bx0 + bw + 50, tw = 80;
    const towerH = Math.min(ph, swaps * 6);
    ctx.fillStyle = '#cdc8be'; ctx.fillRect(tx0, py0 + ph - towerH, tw, towerH);
    // banded with old filament colours
    for (let i = 0; i < Math.floor(towerH / 6); i++) { ctx.fillStyle = i % 2 === 0 ? rgb(COL_A) : rgb(COL_B); ctx.fillRect(tx0, py0 + ph - (i + 1) * 6, tw, 5); }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.strokeRect(tx0, py0, tw, ph);
    ctx.fillStyle = '#e3def0'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`purge tower (${swaps} swaps)`, tx0 + tw / 2, py0 - 12);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`finer stripes blend better in the eye, but every filament swap dumps a bit into the purge tower beside the part`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new FdmGradient());
