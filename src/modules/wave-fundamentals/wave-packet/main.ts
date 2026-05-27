import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Gaussian wave packet:  y(x,t) = exp(-((x-vg·t)/σ)²) · cos(k·x − ω·t)
 *   group velocity vg, phase velocity vp = ω/k.
 * The "dispersion" slider sets vp/vg ratio (1 = no dispersion, >1 = normal disp).
 */
class WavePacket {
  private stage: CanvasStage;
  private ratio = 1.6;        // vp / vg
  private k = 0.08;            // spatial frequency (rad/px)
  private animId = 0;
  private startTime = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.ratio = hydrateNumber('r', 16) / 10;
    this.k = hydrateNumber('k', 8) / 100;
    (document.getElementById('r') as EncSlider).value = this.ratio * 10;
    (document.getElementById('k') as EncSlider).value = this.k * 100;

    registerStateParam('r', () => Math.round(this.ratio * 10));
    registerStateParam('k', () => Math.round(this.k * 100));

    (document.getElementById('r') as EncSlider).addEventListener('input', (e) => {
      this.ratio = (e.target as EncSlider).value / 10; notifyStateChange();
    });
    (document.getElementById('k') as EncSlider).addEventListener('input', (e) => {
      this.k = (e.target as EncSlider).value / 100; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.ratio = 1.6; this.k = 0.08;
      (document.getElementById('r') as EncSlider).value = 16;
      (document.getElementById('k') as EncSlider).value = 8;
      notifyStateChange();
    });

    this.startTime = performance.now();
    this.loop();
  }

  private loop = () => {
    this.draw();
    this.animId = requestAnimationFrame(this.loop);
  };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h / 2;
    const amp = Math.min(80, h * 0.3);
    const t = (performance.now() - this.startTime) / 1000;

    // Period the packet returns to start: choose vg so packet crosses canvas in ~6s.
    const vg = w / 6;
    const vp = vg * this.ratio;
    const omega = this.k * vp;
    const sigma = 100;        // envelope width (px)
    const xC = ((vg * t) % (w + 2 * sigma)) - sigma;

    // Baseline
    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    // Envelope (dashed gold)
    ctx.strokeStyle = theme.goldAlpha(0.6);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const env = Math.exp(-(((x - xC) / sigma) ** 2));
      const y = cy - amp * env;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const env = Math.exp(-(((x - xC) / sigma) ** 2));
      const y = cy + amp * env;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Full packet
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const env = Math.exp(-(((x - xC) / sigma) ** 2));
      const y = cy - amp * env * Math.cos(this.k * x - omega * t);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Markers: envelope centre (group, gold) and a specific crest (phase, crimson)
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(xC, cy, 6, 0, Math.PI * 2); ctx.fill();
    // A crest that sits near the centre — choose nearest crest to xC at time t
    const crestX = ((omega / this.k) * t) % w;
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(crestX, cy, 4, 0, Math.PI * 2); ctx.fill();

    // Readouts
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`v_group  = ${vg.toFixed(0)} px/s  (envelope)`, 16, 30);
    ctx.fillStyle = theme.crimson;
    ctx.fillText(`v_phase = ${vp.toFixed(0)} px/s  (crests)`, 16, 52);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(this.ratio > 1.1 ? 'NORMAL DISPERSION (vp > vg)' :
                 this.ratio < 0.9 ? 'ANOMALOUS DISPERSION (vp < vg)' :
                 'NON-DISPERSIVE (vp = vg)', 16, 72);
    void this.animId;
  }
}

window.addEventListener('DOMContentLoaded', () => new WavePacket());
