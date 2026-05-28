import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const VERDET = 40; // °/(T·m), illustrative high-Verdet medium

class FaradayRotation {
  private stage: CanvasStage;
  private B = 1.5;   // T
  private L = 10;    // cm
  private back = 0;  // 0 single, 1 reflected return pass

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.B = hydrateNumber('B', 1.5);
    this.L = hydrateNumber('L', 10);
    this.back = hydrateNumber('back', 0);
    (document.getElementById('B') as EncSlider).value = this.B;
    (document.getElementById('L') as EncSlider).value = this.L;
    (document.getElementById('back') as EncSlider).value = this.back;
    registerStateParam('B', () => this.B);
    registerStateParam('L', () => this.L);
    registerStateParam('back', () => this.back);
    for (const id of ['B', 'L', 'back']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'B') this.B = v;
        else if (id === 'L') this.L = v;
        else this.back = Math.round(v);
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.B = 1.5; this.L = 10; this.back = 0;
      (document.getElementById('B') as EncSlider).value = 1.5;
      (document.getElementById('L') as EncSlider).value = 10;
      (document.getElementById('back') as EncSlider).value = 0;
      this.draw(); notifyStateChange();
    });
  }

  private betaSingle(): number {
    return VERDET * this.B * (this.L / 100); // degrees
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const beta = this.betaSingle();
    const total = this.back ? 2 * beta : beta;  // non-reciprocal doubling
    const cy = h * 0.42;
    const tubeX0 = w * 0.22, tubeX1 = w * 0.78;
    const tubeR = Math.min(h * 0.14, 52);

    // Faraday medium tube.
    ctx.fillStyle = 'rgba(90,120,150,0.10)';
    ctx.fillRect(tubeX0, cy - tubeR, tubeX1 - tubeX0, 2 * tubeR);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    ctx.strokeRect(tubeX0, cy - tubeR, tubeX1 - tubeX0, 2 * tubeR);

    // B-field arrows along propagation (slate), pointing right (+z).
    ctx.strokeStyle = theme.slateAlpha(0.6); ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const x = tubeX0 + (tubeX1 - tubeX0) * ((i + 0.5) / 5);
      ctx.beginPath(); ctx.moveTo(x - 16, cy - tubeR - 14); ctx.lineTo(x + 16, cy - tubeR - 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 16, cy - tubeR - 14); ctx.lineTo(x + 9, cy - tubeR - 18); ctx.moveTo(x + 16, cy - tubeR - 14); ctx.lineTo(x + 9, cy - tubeR - 10); ctx.stroke();
    }
    ctx.fillStyle = theme.slate; ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('B field →', (tubeX0 + tubeX1) / 2 - 24, cy - tubeR - 24);

    // Forward pass rotation along tube.
    const segs = 24;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const x = tubeX0 + (tubeX1 - tubeX0) * f;
      const ang = (beta * f) * DEG;
      const len = tubeR * 0.78;
      const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
      ctx.strokeStyle = theme.crimsonAlpha(0.3 + 0.45 * f); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - dx, cy + dy); ctx.lineTo(x + dx, cy - dy); ctx.stroke();
    }

    const drawArrow = (x: number, angDeg: number, col: string, label: string) => {
      const ang = angDeg * DEG, len = tubeR * 0.9;
      const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
      ctx.strokeStyle = col; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x - dx, cy + dy); ctx.lineTo(x + dx, cy - dy); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText(label, x - 16, cy + tubeR + 30);
    };
    drawArrow(tubeX0 - 34, 0, theme.slate, 'input 0°');
    drawArrow(tubeX1 + 34, beta, theme.crimson, `fwd ${beta.toFixed(0)}°`);

    // Return-pass illustration.
    if (this.back) {
      const ry = h * 0.78;
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('reflected return pass (light now travels ←, but B is unchanged):', tubeX0, ry - tubeR - 8);
      // On return, rotation adds (non-reciprocal): output at 2β, not 0.
      drawArrow(tubeX1 + 34, beta, theme.inkAlpha(0.5), '');
      // Final arrow at exit (left side) at 2β.
      ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.6;
      const ang = total * DEG, len = tubeR * 0.9;
      const dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
      ctx.beginPath(); ctx.moveTo((tubeX0 - 34) - dx, ry + dy); ctx.lineTo((tubeX0 - 34) + dx, ry - dy); ctx.stroke();
      ctx.fillStyle = theme.crimson; ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText(`returns at ${total.toFixed(0)}° — not 0°`, (tubeX0 - 34) - 20, ry + tubeR + 18);
    }

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`β = V·B·L = ${beta.toFixed(1)}°  (single pass)`, 16, 26);
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`V = ${VERDET} °/(T·m)   B = ${this.B.toFixed(2)} T   L = ${this.L} cm`, 16, 48);
    if (this.back) {
      ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText(`round trip = ${(2 * beta).toFixed(0)}° (non-reciprocal) — basis of the optical isolator`, 16, 70);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new FaradayRotation());
