import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class StandingWave {
  private stage: CanvasStage;
  private mode = 3;        // mode number n (number of half-wavelengths in box)
  private animId = 0;
  private startTime = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.mode = hydrateNumber('n', 3);
    (document.getElementById('n') as EncSlider).value = this.mode;
    registerStateParam('n', () => this.mode);

    (document.getElementById('n') as EncSlider).addEventListener('input', (e) => {
      this.mode = (e.target as EncSlider).value; notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.mode = 3;
      (document.getElementById('n') as EncSlider).value = 3;
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

    const xL = 60, xR = w - 60;
    const L = xR - xL;
    const cy = h / 2;
    const amp = Math.min(80, h * 0.28);
    const t = (performance.now() - this.startTime) / 1000;
    const omega = 2 * Math.PI * 0.6;   // visible-speed angular frequency

    const k = (this.mode * Math.PI) / L;   // mode k satisfies sin(k·0)=sin(k·L)=0

    // Walls
    ctx.fillStyle = theme.ink;
    ctx.fillRect(xL - 6, cy - amp - 30, 4, 2 * amp + 60);
    ctx.fillRect(xR + 2,  cy - amp - 30, 4, 2 * amp + 60);

    // Incident wave (rightward)
    const drawTraveling = (sign: 1 | -1, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let x = xL; x <= xR; x++) {
        const xi = x - xL;
        const y = cy - (amp / 2) * Math.sin(k * xi - sign * omega * t);
        if (x === xL) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    drawTraveling(1, theme.inkAlpha(0.35));
    drawTraveling(-1, theme.slateAlpha(0.45));

    // Standing-wave sum: 2·sin(k·x)·cos(ωt)
    ctx.strokeStyle = theme.crimson;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = xL; x <= xR; x++) {
      const xi = x - xL;
      const y = cy - amp * Math.sin(k * xi) * Math.cos(omega * t);
      if (x === xL) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Node markers
    for (let i = 0; i <= this.mode; i++) {
      const xi = (i / this.mode) * L;
      const x = xL + xi;
      ctx.fillStyle = theme.goldDeep;
      ctx.beginPath(); ctx.arc(x, cy, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Envelope guides
    ctx.strokeStyle = theme.goldAlpha(0.3);
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let x = xL; x <= xR; x++) {
      const xi = x - xL;
      const y = cy - amp * Math.abs(Math.sin(k * xi));
      if (x === xL) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = xL; x <= xR; x++) {
      const xi = x - xL;
      const y = cy + amp * Math.abs(Math.sin(k * xi));
      if (x === xL) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`mode n = ${this.mode}`, 16, 28);
    ctx.fillText(`λ_n = ${(2 * L / this.mode).toFixed(0)} px  (= 2L/n)`, 16, 50);
    ctx.fillText(`nodes = ${this.mode + 1}`, 16, 72);
    void axisStyle;
    void this.animId;
  }
}

window.addEventListener('DOMContentLoaded', () => new StandingWave());
