import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type SensorModel = 'invariant' | 'non-invariant';
const MODELS: SensorModel[] = ['invariant', 'non-invariant'];

function gauss(): number {
  const u1 = Math.random() || 1e-9, u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function poisson(mean: number): number {
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss()));
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

const ISO_PUSH = 32; // 5 stops

class ISOInvariance {
  private stage: CanvasStage;
  private model: SensorModel = 'invariant';
  private signal = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('sensor');
    if (raw && (MODELS as string[]).includes(raw)) this.model = raw as SensorModel;
    this.signal = hydrateNumber('signal', 80);
    const t = document.getElementById('sensor') as EncToggle; t.value = this.model;
    t.addEventListener('change', (e) => { this.model = (e as CustomEvent).detail.value as SensorModel; this.draw(); notifyStateChange(); });
    const s = document.getElementById('signal') as EncSlider; s.value = this.signal;
    s.addEventListener('input', (e) => { this.signal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sensor', () => this.model);
    registerStateParam('signal', () => Math.round(this.signal));
    document.addEventListener('reset-params', () => { this.model = 'invariant'; this.signal = 80; t.value = 'invariant'; s.value = 80; this.draw(); notifyStateChange(); });
  }

  // Render path A or B
  // Path A: ISO 100, −5 EV → physicalSignal photons (= signal / 32). gain=1, then digital push x32. rnAfter is multiplied by push.
  // Path B: ISO 3200, correct exposure → same physicalSignal photons. gain=32 in-camera. rnAfter not multiplied.
  private renderPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, path: 'A' | 'B') {
    // Read noise allocation (code-value scale)
    const rnBefore = 3.0;
    const rnAfter = this.model === 'invariant' ? 0.5 : 8.0;

    const physicalSignal = this.signal / ISO_PUSH;
    const img = g.createImageData(Math.floor(w), Math.floor(h));
    for (let i = 0; i < img.data.length; i += 4) {
      const captured = poisson(physicalSignal);
      const noiseBefore = rnBefore * gauss();
      // Path A: in-camera gain = 1, then digital push x32 multiplies signal AND rnAfter (because rnAfter is added at ISO-1 stage and then pushed).
      // Path B: in-camera gain = 32, applied once; rnAfter is added downstream AFTER the gain so contributes directly.
      let value: number;
      if (path === 'A') {
        const isoStageRn = rnAfter * gauss();
        value = (captured + noiseBefore + isoStageRn) * ISO_PUSH;
      } else {
        const downstreamRn = rnAfter * gauss();
        value = (captured + noiseBefore) * ISO_PUSH + downstreamRn;
      }
      value = Math.max(0, Math.min(255, value));
      img.data[i] = value; img.data[i + 1] = value; img.data[i + 2] = value; img.data[i + 3] = 255;
    }
    g.putImageData(img, x, y);
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(x, y, w, h);
  }

  // Predict standard deviation analytically for the readout
  private predictedStdev(path: 'A' | 'B'): number {
    const rnBefore = 3.0;
    const rnAfter = this.model === 'invariant' ? 0.5 : 8.0;
    const physicalSignal = this.signal / ISO_PUSH;
    const shotNoise2 = physicalSignal; // Poisson variance
    const rnBefore2 = rnBefore * rnBefore;
    if (path === 'A') {
      // (shot + rnBefore + rnAfter) * 32 — variance multiplies by 32²
      const totalBeforeGain2 = shotNoise2 + rnBefore2 + rnAfter * rnAfter;
      return Math.sqrt(totalBeforeGain2) * ISO_PUSH;
    } else {
      // (shot + rnBefore) * 32 + rnAfter
      const v = (shotNoise2 + rnBefore2) * ISO_PUSH * ISO_PUSH + rnAfter * rnAfter;
      return Math.sqrt(v);
    }
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const colW = (w - 3 * M) / 2;
    const panelH = 240;

    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('Path A — ISO 100, −5 EV exposure, RAW push +5 stops', M, M);
    g.fillText('Path B — ISO 3200, correct exposure (in-camera gain)', M + colW + M, M);

    this.renderPath(g, M, M + 14, colW, panelH, 'A');
    this.renderPath(g, M + colW + M, M + 14, colW, panelH, 'B');

    // Stats
    const sy = M + 14 + panelH + 30;
    const sigA = this.predictedStdev('A');
    const sigB = this.predictedStdev('B');
    g.fillStyle = theme.crimson; g.font = '13px serif';
    g.fillText('predicted standard deviation (lower = cleaner)', M, sy);
    g.fillStyle = theme.ink; g.font = '12px monospace';
    g.fillText(`Path A: σ ≈ ${sigA.toFixed(1)}     Path B: σ ≈ ${sigB.toFixed(1)}     ratio A/B = ${(sigA / sigB).toFixed(2)}×`, M, sy + 18);

    g.fillStyle = theme.inkAlpha(0.75); g.font = '12px serif';
    g.fillText(`Sensor model: ${this.model}`, M, sy + 40);

    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    g.fillText('Both paths see the same physical light. The difference is where the dominant read-noise enters relative to the gain stage.', M, sy + 60);

    if (this.model === 'invariant') {
      g.fillStyle = theme.gold; g.font = '12px serif';
      g.fillText('Invariant sensor: read-noise dominated by the BEFORE-gain term. Pushing RAW = ISO 3200, no penalty.', M, sy + 82);
    } else {
      g.fillStyle = theme.crimson; g.font = '12px serif';
      g.fillText('Non-invariant sensor: significant read-noise AFTER the gain stage. Path A pushes that noise x32 — Path B avoids it. Crank ISO when you can.', M, sy + 82);
    }

    g.fillStyle = theme.inkAlpha(0.55); g.font = '11px serif';
    g.fillText('Real cameras: Sony A7R-series and modern Nikon Z are largely invariant above ISO 200. Canon 5D Mark III is famously non-invariant.', M, sy + 104);
  }
}

new ISOInvariance();
