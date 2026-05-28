import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const V_TH = 1.0, V_SAT = 3.0;

// Twist angle (deg) as a function of voltage: 90° below threshold, → 0 above saturation.
function twistAngle(V: number): number {
  if (V <= V_TH) return 90;
  if (V >= V_SAT) return 0;
  const t = (V - V_TH) / (V_SAT - V_TH);
  const s = t * t * (3 - 2 * t);   // smoothstep
  return 90 * (1 - s);
}

class LcdShutter {
  private stage: CanvasStage;
  private V = 0;
  private mode = 0; // 0 normally-white (crossed), 1 normally-black (parallel)

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.V = hydrateNumber('V', 0);
    this.mode = hydrateNumber('mode', 0);
    (document.getElementById('V') as EncSlider).value = this.V;
    (document.getElementById('mode') as EncSlider).value = this.mode;
    registerStateParam('V', () => this.V);
    registerStateParam('mode', () => this.mode);
    for (const id of ['V', 'mode']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'V') this.V = v; else this.mode = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.V = 0; this.mode = 0;
      (document.getElementById('V') as EncSlider).value = 0;
      (document.getElementById('mode') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private transmission(V: number): number {
    const phi = twistAngle(V) * DEG;
    return this.mode === 0 ? Math.sin(phi) ** 2 : Math.cos(phi) ** 2;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const phi = twistAngle(this.V);
    const T = this.transmission(this.V);

    // --- Left: LC cell schematic with director layers twisting. ---
    const cellX = w * 0.12, cellY = h * 0.18, cellW = w * 0.32, cellH = h * 0.5;
    ctx.fillStyle = theme.slateAlpha(0.08);
    ctx.fillRect(cellX, cellY, cellW, cellH);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.strokeRect(cellX, cellY, cellW, cellH);

    // Director rods at several depth layers; orientation interpolates 0→twist.
    const layers = 7;
    const tilt = 1 - phi / 90;  // 0 (flat, twisting) → 1 (standing up)
    for (let i = 0; i < layers; i++) {
      const yy = cellY + cellH * ((i + 0.5) / layers);
      const ang = (phi * DEG) * (i / (layers - 1));  // twist progresses with depth
      const rodLen = 18 * (1 - 0.6 * tilt);          // shorter as molecules stand up (foreshortening)
      const dxr = Math.cos(ang) * rodLen, dyr = Math.sin(ang) * rodLen;
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const cxk = cellX + cellW * ((k + 0.5) / 4);
        ctx.beginPath(); ctx.moveTo(cxk - dxr / 2, yy - dyr / 2); ctx.lineTo(cxk + dxr / 2, yy + dyr / 2); ctx.stroke();
      }
    }
    // Polarizer labels.
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('input pol 0°', cellX, cellY - 8);
    ctx.fillText(this.mode === 0 ? 'analyzer 90° (crossed)' : 'analyzer 0° (parallel)', cellX, cellY + cellH + 16);

    // Output pixel swatch.
    const g = Math.round(255 * T);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(cellX, cellY + cellH + 30, cellW, h * 0.12);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.strokeRect(cellX, cellY + cellH + 30, cellW, h * 0.12);
    ctx.fillStyle = T > 0.5 ? theme.ink : theme.paper;
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`pixel ${(T * 100).toFixed(0)}%`, cellX + cellW / 2 - 28, cellY + cellH + 30 + h * 0.07);

    // --- Right: T vs V curve. ---
    const plotX = w * 0.56, plotY = h * 0.2, plotW = w * 0.36, plotH = h * 0.46;
    const xOf = (V: number) => plotX + (V / 5) * plotW;
    const yOf = (t: number) => plotY + (1 - t) * plotH;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.9;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const V = (5 * i) / 200;
      const px = xOf(V), py = yOf(this.transmission(V));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Threshold + saturation markers.
    ctx.strokeStyle = theme.goldAlpha(0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(V_TH), plotY); ctx.lineTo(xOf(V_TH), plotY + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xOf(V_SAT), plotY); ctx.lineTo(xOf(V_SAT), plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Current point.
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(xOf(this.V), yOf(T), 4.5, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let V = 0; V <= 5; V += 1) ctx.fillText(`${V}`, xOf(V) - 3, plotY + plotH + 13);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('drive voltage (V)', plotX + plotW * 0.3, plotY + plotH + 26);
    ctx.fillText('V_th', xOf(V_TH) - 8, plotY - 2); ctx.fillText('V_sat', xOf(V_SAT) - 10, plotY - 2);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`V = ${this.V.toFixed(2)} V   twist φ = ${phi.toFixed(0)}°   T = ${(T * 100).toFixed(0)}%`, 16, 30);
  }
}
window.addEventListener('DOMContentLoaded', () => new LcdShutter());
