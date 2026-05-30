import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// A simple "frame" — synthesised patches representing a typical scene
// (skin / sky / wood / road / shadow / specular)
const FRAME: { x: number; y: number; w: number; h: number; rgb: [number, number, number]; label: string }[] = [
  { x: 0.10, y: 0.45, w: 0.18, h: 0.30, rgb: [194, 150, 130], label: 'skin' },
  { x: 0.30, y: 0.45, w: 0.18, h: 0.30, rgb: [115, 82, 68], label: 'skin shadow' },
  { x: 0.00, y: 0.00, w: 1.00, h: 0.30, rgb: [110, 140, 175], label: 'sky' },
  { x: 0.00, y: 0.75, w: 1.00, h: 0.25, rgb: [60, 50, 45],  label: 'road' },
  { x: 0.55, y: 0.40, w: 0.20, h: 0.40, rgb: [120, 95, 60], label: 'wood/wall' },
  { x: 0.78, y: 0.30, w: 0.20, h: 0.30, rgb: [220, 200, 180], label: 'highlight' },
];

// Apply teal-orange recipe at strength s in [0,1]
function tealOrange(rgb: [number, number, number], s: number): [number, number, number] {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Shadow weight (toward teal — push R down, B/G up)
  const wS = Math.max(0, 1 - lum * 1.6);
  // Highlight weight (toward orange — push R up, B down)
  const wH = Math.max(0, lum - 0.4) * 1.5;
  const r2 = r + s * (wH * 0.20 - wS * 0.08);
  const g2 = g + s * (wH * 0.05 + wS * 0.02);
  const b2 = b + s * (wH * (-0.15) + wS * 0.18);
  return [Math.min(255, Math.max(0, r2 * 255)), Math.min(255, Math.max(0, g2 * 255)), Math.min(255, Math.max(0, b2 * 255))];
}

class TealOrange {
  private stage: CanvasStage;
  private strength = 60;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.strength = hydrateNumber('strength', 60);
    const s = document.getElementById('strength') as EncSlider; s.value = this.strength;
    s.addEventListener('input', (e) => { this.strength = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('strength', () => Math.round(this.strength));
    document.addEventListener('reset-params', () => { this.strength = 60; s.value = 60; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w: W, h: H } = this.stage.logicalSize;
    if (W === 0 || H === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, W, H);

    const M = 24;
    const frameW = (W - 3 * M) / 2;
    const frameH = frameW * 9 / 16;

    // Frame "before"
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('before grade', M, M + 12);
    for (const f of FRAME) {
      g.fillStyle = `rgb(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]})`;
      g.fillRect(M + f.x * frameW, M + 18 + f.y * frameH, f.w * frameW, f.h * frameH);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, M + 18, frameW, frameH);

    // Frame "after"
    const aX = M * 2 + frameW;
    g.fillStyle = theme.ink; g.font = '13px serif';
    g.fillText(`after teal-orange · ${this.strength}%`, aX, M + 12);
    const s = this.strength / 100;
    for (const f of FRAME) {
      const c = tealOrange(f.rgb, s);
      g.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
      g.fillRect(aX + f.x * frameW, M + 18 + f.y * frameH, f.w * frameW, f.h * frameH);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(aX, M + 18, frameW, frameH);

    // Bottom: chromaticity / scatter — luminance vs (R-B)
    const cy = M + 18 + frameH + 40;
    const ch = H - cy - M - 20;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('luminance vs (R−B) — push of patches toward warm (top) or cool (bottom) axis', M, cy - 8);

    const px = M, py = cy, pw = W - 2 * M;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ch);

    // Axes
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'right';
    g.fillText('R-B +100', px - 4, py + 12);
    g.fillText('R-B 0', px - 4, py + ch / 2 + 4);
    g.fillText('R-B −100', px - 4, py + ch - 4);
    g.textAlign = 'center';
    g.fillText('luminance →', px + pw / 2, py + ch + 16);

    g.strokeStyle = theme.inkAlpha(0.3); g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(px, py + ch / 2); g.lineTo(px + pw, py + ch / 2); g.stroke();
    g.setLineDash([]);

    // Plot original patches and graded patches
    for (const f of FRAME) {
      const lum0 = 0.2126 * f.rgb[0] + 0.7152 * f.rgb[1] + 0.0722 * f.rgb[2];
      const rb0 = f.rgb[0] - f.rgb[2];
      const X0 = px + (lum0 / 255) * pw;
      const Y0 = py + ch / 2 - (rb0 / 255) * ch / 2;

      const c = tealOrange(f.rgb, s);
      const lum1 = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const rb1 = c[0] - c[2];
      const X1 = px + (lum1 / 255) * pw;
      const Y1 = py + ch / 2 - (rb1 / 255) * ch / 2;

      // before swatch
      g.fillStyle = `rgb(${f.rgb[0]},${f.rgb[1]},${f.rgb[2]})`;
      g.beginPath(); g.arc(X0, Y0, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = theme.inkAlpha(0.7); g.stroke();
      // arrow
      g.strokeStyle = theme.crimson; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X1, Y1); g.stroke();
      // after swatch
      g.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
      g.beginPath(); g.arc(X1, Y1, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = theme.crimson; g.stroke();
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
      g.fillText(f.label, X1 + 9, Y1 + 4);
    }

    // Labels
    g.fillStyle = '#b9621e'; g.font = '11px serif'; g.textAlign = 'right';
    g.fillText('orange (highlights)', px + pw - 4, py + 12);
    g.fillStyle = '#1f7a8a';
    g.fillText('teal (shadows)', px + pw - 4, py + ch - 4);
  }
}

new TealOrange();
