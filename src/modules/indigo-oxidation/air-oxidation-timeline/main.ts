import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TAU = 12;

class AirOxidation {
  private stage: CanvasStage;
  private t = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.t = hydrateNumber('t', 0);
    const s = document.getElementById('t') as EncSlider; s.value = this.t;
    s.addEventListener('input', (e) => { this.t = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => this.t.toFixed(1));
    document.addEventListener('reset-params', () => { this.t = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private fracOxidised(t: number): number {
    // first-order kinetics with τ = 12 s (representative; varies with humidity, agitation, dye load)
    return 1 - Math.exp(-t / TAU);
  }

  private blendColor(f: number): string {
    const a = { r: 0xc8, g: 0xc8, b: 0x50 };
    const b = { r: 0x1f, g: 0x3a, b: 0x8a };
    const R = Math.round(a.r * (1 - f) + b.r * f);
    const G = Math.round(a.g * (1 - f) + b.g * f);
    const B = Math.round(a.b * (1 - f) + b.b * f);
    return `rgb(${R},${G},${B})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const f = this.fracOxidised(this.t);
    const col = this.blendColor(f);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`t = ${this.t.toFixed(1)} s · oxidised fraction = ${(f * 100).toFixed(0)} % · τ ≈ ${TAU} s`, M, M);

    // Cloth swatch live (large)
    const cx = M, cy = M + 30, cw = (w - 2 * M) * 0.5, ch = h - 2 * M - 110;
    g.fillStyle = col; g.fillRect(cx, cy, cw, ch);
    // weave
    g.strokeStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < cw; i += 4) { g.beginPath(); g.moveTo(cx + i, cy); g.lineTo(cx + i, cy + ch); g.stroke(); }
    for (let j = 0; j < ch; j += 4) { g.beginPath(); g.moveTo(cx, cy + j); g.lineTo(cx + cw, cy + j); g.stroke(); }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('cloth swatch (live)', cx + cw / 2, cy + ch + 16);

    // Time-series strip (right): 7 stamped snapshots
    const sx = cx + cw + 30, sy = cy, sw = w - sx - M, sh = ch;
    const snapshots = [0, 5, 10, 15, 20, 30, 60];
    const cellW = (sw - 6 * 6) / snapshots.length;
    for (let i = 0; i < snapshots.length; i++) {
      const ts = snapshots[i];
      const fs = this.fracOxidised(ts);
      const c2 = this.blendColor(fs);
      const x = sx + i * (cellW + 6), y = sy + 20;
      g.fillStyle = c2; g.fillRect(x, y, cellW, sh * 0.7);
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x, y, cellW, sh * 0.7);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${ts} s`, x + cellW / 2, y + sh * 0.7 + 14);
    }
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'left';
    g.fillText('snapshot strip (0–60 s)', sx, sy + 12);

    // Kinetics curve (bottom)
    const kx = M, ky = h - M - 60, kw = w - 2 * M, kh = 50;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(kx, ky, kw, kh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('0 s', kx, ky + kh + 14);
    g.textAlign = 'right'; g.fillText('60 s', kx + kw, ky + kh + 14);
    g.textAlign = 'center'; g.fillText('fraction oxidised vs time (1 − e^{-t/τ})', kx + kw / 2, ky - 4);

    const X = (tt: number) => kx + (tt / 60) * kw;
    const Y = (v: number) => ky + (1 - v) * kh;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let tt = 0; tt <= 60; tt += 0.5) {
      const X0 = X(tt), Y0 = Y(this.fracOxidised(tt));
      if (tt === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.t), Y(f), 5, 0, Math.PI * 2); g.fill();
  }
}

new AirOxidation();
