import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class InverseSquare {
  private stage: CanvasStage;
  private r = 3;
  private readonly I = 1.0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.r = hydrateNumber('r', 3);
    (document.getElementById('r') as EncSlider).value = this.r;
    registerStateParam('r', () => Number(this.r.toFixed(2)));

    const slider = document.getElementById('r') as EncSlider;
    slider.addEventListener('input', () => {
      this.r = slider.value;
      this.draw();
      notifyStateChange();
    });

    document.addEventListener('reset-params', () => this.reset());
  }

  private reset() {
    (document.getElementById('r') as EncSlider).value = 3;
    this.r = 3;
    this.draw();
    notifyStateChange();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cx = 80, cy = h / 2;
    const xMax = w - 60;
    const rMax = 10;
    const px = (rUnits: number) => cx + (rUnits / rMax) * (xMax - cx);

    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(xMax, cy); ctx.stroke();

    ctx.strokeStyle = axisStyle.grid;
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    for (let i = 0; i <= rMax; i++) {
      const x = px(i);
      ctx.beginPath(); ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); ctx.stroke();
      if (i % 2 === 0) ctx.fillText(`${i}`, x - 3, cy + 18);
    }

    // Source (gold disk)
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('source', cx - 25, cy - 18);

    // Rays
    const rayCount = 32;
    ctx.strokeStyle = theme.inkAlpha(0.12);
    const sx = px(this.r);
    for (let i = 0; i < rayCount; i++) {
      const ang = -Math.PI * 0.38 + (i / (rayCount - 1)) * Math.PI * 0.76;
      const len = sx - cx;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Sensor
    ctx.fillStyle = theme.ink;
    ctx.fillRect(sx - 6, cy - 18, 12, 36);
    ctx.fillStyle = theme.inkMute;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('sensor', sx - 14, cy + 36);

    const E = this.I / (this.r * this.r);

    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`r = ${this.r.toFixed(2)} m`, w - 200, 30);
    ctx.fillText(`E = ${E.toFixed(3)} I·m⁻²`, w - 200, 52);

    // 1/r² curve below
    const plotY = h - 60, plotH = 100;
    ctx.strokeStyle = axisStyle.grid;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(cx, plotY); ctx.lineTo(xMax, plotY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let rs = 0.5; rs <= rMax; rs += 0.05) {
      const y = plotY - (1 / (rs * rs)) * plotH;
      const x = px(rs);
      if (rs === 0.5) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const yE = plotY - E * plotH;
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.arc(sx, Math.max(yE, plotY - plotH), 5, 0, Math.PI * 2); ctx.fill();
  }
}

window.addEventListener('DOMContentLoaded', () => new InverseSquare());
