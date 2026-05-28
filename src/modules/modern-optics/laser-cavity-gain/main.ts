import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const GAIN_SCALE = 0.004;   // round-trip gain per unit pump
const INTERNAL_LOSS = 0.01; // fixed internal round-trip loss

class LaserCavity {
  private stage: CanvasStage;
  private pump = 50;
  private R = 0.95;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pump = hydrateNumber('pump', 50);
    this.R = hydrateNumber('R', 0.95);
    (document.getElementById('pump') as EncSlider).value = this.pump;
    (document.getElementById('R') as EncSlider).value = this.R;
    registerStateParam('pump', () => this.pump);
    registerStateParam('R', () => this.R);
    for (const id of ['pump', 'R']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'pump') this.pump = v; else this.R = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.pump = 50; this.R = 0.95;
      (document.getElementById('pump') as EncSlider).value = 50;
      (document.getElementById('R') as EncSlider).value = 0.95;
      this.draw(); notifyStateChange();
    });
  }

  private loss(): number { return -Math.log(this.R) + INTERNAL_LOSS; }
  private threshold(): number { return this.loss() / GAIN_SCALE; }
  private output(pump: number): number {
    const pth = this.threshold();
    if (pump <= pth) return 0;
    return (1 - this.R) * (pump - pth); // output coupling × intracavity excess
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pth = this.threshold();
    const lasing = this.pump > pth;

    // --- Cavity schematic (top). ---
    const cavY = h * 0.20, cavX0 = w * 0.16, cavX1 = w * 0.74;
    // Mirrors.
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cavX0, cavY - 30); ctx.lineTo(cavX0, cavY + 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cavX1, cavY - 30); ctx.lineTo(cavX1, cavY + 30); ctx.stroke();
    // Gain medium.
    ctx.fillStyle = 'rgba(200,120,200,0.18)';
    ctx.fillRect(cavX0 + 20, cavY - 20, (cavX1 - cavX0) - 40, 40);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(cavX0 + 20, cavY - 20, (cavX1 - cavX0) - 40, 40);
    // Intracavity beam brightness ∝ output (when lasing).
    const beamI = lasing ? Math.min(1, this.output(this.pump) / 30) : 0.06;
    ctx.strokeStyle = `rgba(220,60,90,${0.25 + 0.75 * beamI})`; ctx.lineWidth = 2 + 4 * beamI;
    ctx.beginPath(); ctx.moveTo(cavX0, cavY); ctx.lineTo(cavX1, cavY); ctx.stroke();
    // Output beam exits right mirror.
    if (lasing) {
      ctx.strokeStyle = `rgba(220,60,90,${0.4 + 0.6 * beamI})`; ctx.lineWidth = 2 + 4 * beamI;
      ctx.beginPath(); ctx.moveTo(cavX1, cavY); ctx.lineTo(cavX1 + 60, cavY); ctx.stroke();
    }
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('gain medium', (cavX0 + cavX1) / 2 - 30, cavY + 36);
    ctx.fillText(`R=${this.R.toFixed(3)}`, cavX1 - 8, cavY - 36);

    // --- Output vs pump curve (bottom). ---
    const plotX = w * 0.12, plotY = h * 0.46, plotW = w * 0.76, plotH = h * 0.34;
    const pumpMax = 100;
    const outMax = Math.max(5, this.output(pumpMax) * 1.1);
    const xOf = (p: number) => plotX + (p / pumpMax) * plotW;
    const yOf = (o: number) => plotY + (1 - o / outMax) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const p = (pumpMax * i) / 200;
      const px = xOf(p), py = yOf(this.output(p));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Threshold marker.
    if (pth <= pumpMax) {
      ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xOf(pth), plotY); ctx.lineTo(xOf(pth), plotY + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('threshold', xOf(pth) - 24, plotY - 2);
    }
    // Operating point.
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(xOf(this.pump), yOf(this.output(this.pump)), 5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let p = 0; p <= 100; p += 25) ctx.fillText(`${p}`, xOf(p) - 6, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('pump power', plotX + plotW * 0.42, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 18, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('output power', -36, 0); ctx.restore();

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`pump = ${this.pump}   threshold ≈ ${pth.toFixed(0)}`, 16, 28);
    ctx.fillStyle = lasing ? theme.crimson : theme.inkMute; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(lasing ? `LASING — output ${this.output(this.pump).toFixed(1)} (arb.)` : 'below threshold — spontaneous glow only', 16, 50);
  }
}
window.addEventListener('DOMContentLoaded', () => new LaserCavity());
