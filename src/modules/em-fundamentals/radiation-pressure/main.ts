import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

/**
 * Pressure on a surface from a beam of intensity I (W/m²):
 *   absorber:  P = I / c
 *   reflector: P = 2I / c
 *
 * For a 1 m² sail under solar intensity I ≈ 1361 W/m², force ≈ 4.5 μN (absorber).
 */
class RadiationPressure {
  private stage: CanvasStage;
  private intensity = 1361;   // W/m² (solar constant by default)
  private mode: 'absorb' | 'reflect' = 'absorb';
  private photons: { y: number; phase: 'inbound' | 'reflected'; t: number }[] = [];
  private startTime = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.intensity = hydrateNumber('I', 1361);
    const m = hydrateFromUrl('mode');
    if (m === 'reflect' || m === 'absorb') this.mode = m;

    (document.getElementById('I') as EncSlider).value = this.intensity;
    (document.getElementById('mode') as EncToggle).value = this.mode;

    registerStateParam('I', () => Math.round(this.intensity));
    registerStateParam('mode', () => (this.mode === 'absorb' ? undefined : 'reflect'));

    (document.getElementById('I') as EncSlider).addEventListener('input', (e) => {
      this.intensity = (e.target as EncSlider).value; notifyStateChange();
    });
    (document.getElementById('mode') as EncToggle).addEventListener('change', (e: Event) => {
      this.mode = (e as CustomEvent).detail.value as 'absorb' | 'reflect';
      this.photons = [];
      notifyStateChange();
    });

    document.addEventListener('reset-params', () => {
      this.intensity = 1361; this.mode = 'absorb';
      (document.getElementById('I') as EncSlider).value = 1361;
      (document.getElementById('mode') as EncToggle).value = 'absorb';
      this.photons = []; notifyStateChange();
    });

    this.startTime = performance.now();
    this.loop();
  }

  private loop = () => {
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const sailX = w * 0.62;
    const cy = h * 0.5;
    const sailH = Math.min(220, h * 0.55);

    // Sail
    ctx.fillStyle = this.mode === 'reflect' ? theme.paperRecess : theme.ink;
    ctx.fillRect(sailX - 4, cy - sailH / 2, 8, sailH);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sailX - 4, cy - sailH / 2, 8, sailH);

    // Force arrow at sail centre
    const pressureA = this.intensity / 299_792_458;          // absorber
    const pressure = this.mode === 'reflect' ? pressureA * 2 : pressureA;
    const arrowLen = Math.min(80, 12 + pressure * 8e6);      // visual scale
    ctx.strokeStyle = theme.crimson;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sailX + 8, cy);
    ctx.lineTo(sailX + 8 + arrowLen, cy);
    ctx.stroke();
    ctx.fillStyle = theme.crimson;
    ctx.beginPath();
    ctx.moveTo(sailX + 8 + arrowLen + 6, cy);
    ctx.lineTo(sailX + 8 + arrowLen, cy - 5);
    ctx.lineTo(sailX + 8 + arrowLen, cy + 5);
    ctx.closePath(); ctx.fill();
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.crimson;
    ctx.fillText('F', sailX + 8 + arrowLen + 12, cy + 4);

    // Photon stream
    const now = performance.now();
    const dt = (now - this.startTime) / 1000;
    const rate = 80 + this.intensity * 0.04;          // photons per second
    while (this.photons.length < rate * 0.3) {
      this.photons.push({
        y: cy - sailH / 2 + Math.random() * sailH,
        phase: 'inbound',
        t: now,
      });
    }
    const speed = 220;     // px/sec
    for (const p of this.photons) {
      if (p.phase === 'inbound') {
        const age = (now - p.t) / 1000;
        const x = 60 + age * speed;
        if (x >= sailX - 4) {
          if (this.mode === 'reflect') {
            p.phase = 'reflected'; p.t = now;
          } else {
            p.t = -1;  // mark for deletion
            continue;
          }
        }
        ctx.fillStyle = theme.goldDeep;
        ctx.beginPath(); ctx.arc(x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      } else {
        const age = (now - p.t) / 1000;
        const x = sailX - 4 - age * speed;
        if (x < 50) p.t = -1;
        ctx.fillStyle = theme.goldAlpha(0.55);
        ctx.beginPath(); ctx.arc(x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    this.photons = this.photons.filter((p) => p.t > 0);

    // Source label
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('source →', 18, cy - sailH / 2 - 12);
    ctx.fillText(this.mode === 'reflect' ? 'reflector' : 'absorber',
                  sailX - 24, cy - sailH / 2 - 12);

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`I = ${this.intensity} W/m²`, 16, 30);
    ctx.fillText(`mode = ${this.mode}`, 16, 52);
    ctx.fillStyle = theme.ink;
    ctx.fillText(`pressure = ${pressure.toExponential(2)} Pa`, 16, 74);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('P = I/c  (absorber)  or  P = 2I/c  (perfect reflector)', 16, h - 24);
    void dt;
  }
}

window.addEventListener('DOMContentLoaded', () => new RadiationPressure());
