import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const M: number[][] = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]];
const enc = (c: number) => { const x = Math.max(0, Math.min(1, c)); return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255); };
const CORNERS: Array<[number, number, number]> = [];
for (let r = 0; r < 2; r++) for (let g = 0; g < 2; g++) for (let b = 0; b < 2; b++) CORNERS.push([r, g, b]);

class MatrixRotation {
  private stage: CanvasStage;
  private t = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 100);
    (document.getElementById('t') as EncSlider).value = this.t;
    registerStateParam('t', () => this.t);
    (document.getElementById('t') as EncSlider).addEventListener('input', (e) => {
      this.t = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.t = 100;
      (document.getElementById('t') as EncSlider).value = 100;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const t = this.t / 100;
    const Mt = (i: number, j: number) => (i === j ? 1 : 0) * (1 - t) + M[i][j] * t;
    const cx = w * 0.5, cy = h * 0.6, s = Math.min(w, h) * 0.42, A = 0.866;
    const project = ([r, g, b]: [number, number, number]): [number, number] => {
      const X = Mt(0, 0) * r + Mt(0, 1) * g + Mt(0, 2) * b;
      const Y = Mt(1, 0) * r + Mt(1, 1) * g + Mt(1, 2) * b;
      const Z = Mt(2, 0) * r + Mt(2, 1) * g + Mt(2, 2) * b;
      return [cx + (X - Z) * A * s, cy - Y * s + (X + Z) * 0.5 * s];
    };
    const scr = CORNERS.map(project);

    // Edges.
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      let diff = 0; for (let k = 0; k < 3; k++) if (CORNERS[i][k] !== CORNERS[j][k]) diff++;
      if (diff === 1) { ctx.beginPath(); ctx.moveTo(scr[i][0], scr[i][1]); ctx.lineTo(scr[j][0], scr[j][1]); ctx.stroke(); }
    }
    // Corners.
    CORNERS.forEach((c, i) => {
      ctx.fillStyle = `rgb(${enc(c[0])},${enc(c[1])},${enc(c[2])})`;
      ctx.beginPath(); ctx.arc(scr[i][0], scr[i][1], 8, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1; ctx.stroke();
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(t < 0.05 ? 'identity — the plain RGB unit cube' : t > 0.95 ? 'sRGB → XYZ — the colour solid in tristimulus space' : 'shearing toward the sRGB matrix…', w * 0.08, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new MatrixRotation());
