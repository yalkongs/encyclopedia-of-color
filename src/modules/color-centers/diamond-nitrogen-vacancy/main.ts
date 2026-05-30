import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

const SAT = 30;

class NVCenter {
  private stage: CanvasStage;
  private P = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.P = hydrateNumber('P', 10);
    const s = document.getElementById('P') as EncSlider; s.value = this.P;
    s.addEventListener('input', (e) => { this.P = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('P', () => Math.round(this.P));
    document.addEventListener('reset-params', () => { this.P = 10; s.value = 10; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const I = this.P / (this.P + SAT);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pump = ${this.P} mW · normalised emission = ${I.toFixed(2)}  (saturating at SAT=${SAT} mW)`, M, M);

    // Diamond schematic (left)
    const dx = M + 30, dy = M + 60, ds = 280;
    g.fillStyle = '#e8eef4'; g.fillRect(dx, dy, ds, ds);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(dx, dy, ds, ds);
    // Carbon lattice (triangular dots)
    g.fillStyle = '#2a2a2e';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const x = dx + 30 + i * 30 + (j % 2) * 15;
      const y = dy + 30 + j * 30;
      const isN = i === 4 && j === 4;
      const isV = i === 4 && j === 3;
      if (isN) {
        g.fillStyle = '#1f567a'; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = '9px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('N', x, y);
      } else if (isV) {
        g.strokeStyle = theme.crimson; g.lineWidth = 1.5; g.setLineDash([2, 2]);
        g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        g.fillStyle = theme.crimson; g.font = '9px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('V', x, y);
      } else {
        g.fillStyle = '#2a2a2e'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      }
      g.textBaseline = 'alphabetic';
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('N + adjacent V = NV centre', dx + ds / 2, dy + ds + 16);

    // Pump & emission visualization (right)
    const px = dx + ds + 50, py = dy, pw = w - px - M;
    // Pump arrow (green)
    g.strokeStyle = wavelengthCss(532); g.lineWidth = 4;
    g.beginPath(); g.moveTo(px + 20, py + 80); g.lineTo(px + pw / 2 - 30, py + 80);
    g.lineTo(px + pw / 2 - 36, py + 76); g.moveTo(px + pw / 2 - 30, py + 80); g.lineTo(px + pw / 2 - 36, py + 84); g.stroke();
    g.fillStyle = wavelengthCss(532); g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('532 nm pump', px + 20, py + 70);
    // NV centre marker (purple-pink) — colour intensity scales with I
    g.fillStyle = `rgba(120,40,80,${0.4 + 0.6 * I})`;
    g.beginPath(); g.arc(px + pw / 2, py + 80, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(px + pw / 2 - 30, py + 50, 60, 60);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('NV', px + pw / 2, py + 84);

    // Emission arrow (red)
    g.strokeStyle = wavelengthCss(637); g.lineWidth = 2 + 4 * I;
    g.beginPath();
    g.moveTo(px + pw / 2 + 30, py + 80); g.lineTo(px + pw - 20, py + 80);
    g.lineTo(px + pw - 26, py + 76); g.moveTo(px + pw - 20, py + 80); g.lineTo(px + pw - 26, py + 84); g.stroke();
    g.fillStyle = wavelengthCss(637); g.font = '12px serif'; g.textAlign = 'right';
    g.fillText('637 nm emit', px + pw - 20, py + 70);

    // Saturation curve
    const cy = py + 160, ch = 100;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, cy, pw, ch);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('emission saturation P / (P + SAT)', px + pw / 2, cy - 4);
    const X = (P: number) => px + (P / 50) * pw;
    const Y = (v: number) => cy + (1 - v) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let P = 0; P <= 50; P += 0.5) {
      const X0 = X(P), Y0 = Y(P / (P + SAT));
      if (P === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.P), Y(I), 5, 0, Math.PI * 2); g.fill();

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('NV centres are single-photon emitters and atomic-scale magnetometers — used in chip-scale GPS-free navigation and biology micro-imaging.', M, h - M);
  }
}

new NVCenter();
