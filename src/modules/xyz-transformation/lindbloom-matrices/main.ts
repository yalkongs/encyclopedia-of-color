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

type M3 = number[][];
const MATRICES: Record<string, { m: M3; white: string }> = {
  sRGB: { white: 'D65', m: [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]] },
  AdobeRGB: { white: 'D65', m: [[0.5767, 0.1856, 0.1882], [0.2974, 0.6274, 0.0753], [0.0270, 0.0707, 0.9911]] },
  ProPhoto: { white: 'D50', m: [[0.7977, 0.1352, 0.0313], [0.2880, 0.7119, 0.0001], [0.0000, 0.0000, 0.8253]] },
};
const enc = (c: number) => { const x = Math.max(0, Math.min(1, c)); return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255); };

class Lindbloom {
  private stage: CanvasStage;
  private space = 'sRGB'; private r = 80; private g = 50; private b = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.space = hydrateFromUrl('space') ?? 'sRGB';
    this.r = hydrateNumber('r', 80); this.g = hydrateNumber('g', 50); this.b = hydrateNumber('b', 20);
    (document.getElementById('space') as EncToggle).value = this.space;
    registerStateParam('space', () => this.space);
    (document.getElementById('space') as EncToggle).addEventListener('change', (e) => {
      this.space = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    for (const id of ['r', 'g', 'b'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.space = 'sRGB'; this.r = 80; this.g = 50; this.b = 20;
      (document.getElementById('space') as EncToggle).value = 'sRGB';
      for (const id of ['r', 'g', 'b'] as const) (document.getElementById(id) as EncSlider).value = ({ r: 80, g: 50, b: 20 })[id];
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const { m, white } = MATRICES[this.space];
    const rgb = [this.r / 100, this.g / 100, this.b / 100];
    const X = m[0][0] * rgb[0] + m[0][1] * rgb[1] + m[0][2] * rgb[2];
    const Y = m[1][0] * rgb[0] + m[1][1] * rgb[1] + m[1][2] * rgb[2];
    const Z = m[2][0] * rgb[0] + m[2][1] * rgb[1] + m[2][2] * rgb[2];
    const sum = X + Y + Z || 1;

    // Matrix grid.
    const mx = 50, my = 70, cw = w * 0.13, rh = 34;
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`${this.space} → XYZ  (white ${white})`, mx, my - 14);
    ctx.font = '13px JetBrains Mono, monospace';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      ctx.fillStyle = theme.ink;
      ctx.fillText(m[i][j].toFixed(4), mx + j * cw, my + i * rh + 16);
    }
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(mx - 8, my); ctx.lineTo(mx - 8, my + 3 * rh); ctx.moveTo(mx + 3 * cw, my); ctx.lineTo(mx + 3 * cw, my + 3 * rh); ctx.stroke();

    // Result swatch + XYZ + xy.
    const sx = w * 0.62, sy = 70, sw = w * 0.26, sh = h * 0.3;
    ctx.fillStyle = `rgb(${enc(rgb[0])},${enc(rgb[1])},${enc(rgb[2])})`;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = theme.ink; ctx.font = '13px JetBrains Mono, monospace';
    ctx.fillText(`X = ${X.toFixed(3)}`, sx, sy + sh + 22);
    ctx.fillText(`Y = ${Y.toFixed(3)}`, sx, sy + sh + 42);
    ctx.fillText(`Z = ${Z.toFixed(3)}`, sx, sy + sh + 62);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`chromaticity  x ${(X / sum).toFixed(3)}   y ${(Y / sum).toFixed(3)}`, mx, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Lindbloom());
