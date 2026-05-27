import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import {
  planckRadiance, spectralToXYZ, xyzToSrgb, rgbToCssRgb, rgbToCssHex,
  CMF_1931_2DEG, WAVELENGTH_STEP,
} from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class FilamentHeating {
  private stage: CanvasStage;
  private T = 3200;     // start at warm incandescent

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.T = hydrateNumber('T', 3200);
    (document.getElementById('T') as EncSlider).value = this.T;
    registerStateParam('T', () => Math.round(this.T));

    (document.getElementById('T') as EncSlider).addEventListener('input', (e) => {
      this.T = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      (document.getElementById('T') as EncSlider).value = 3200;
      this.T = 3200; this.draw(); notifyStateChange();
    });
  }

  private planckColor(T: number): { hex: string; rgb: { r: number; g: number; b: number } } {
    const S = (lambdaNm: number) => planckRadiance(lambdaNm * 1e-9, T);
    const xyz = spectralToXYZ(S);
    const yref = CMF_1931_2DEG.reduce((s, r) => s + r.yBar, 0) * WAVELENGTH_STEP;
    const scale = 1 / Math.max(yref, 1);
    let rgb = xyzToSrgb({ X: xyz.X * scale, Y: xyz.Y * scale, Z: xyz.Z * scale });
    const peak = Math.max(rgb.r, rgb.g, rgb.b);
    if (peak > 0) rgb = { r: rgb.r / peak, g: rgb.g / peak, b: rgb.b / peak };
    return { hex: rgbToCssHex(rgb), rgb };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const { hex } = this.planckColor(this.T);

    // Filament glow — large rounded rectangle in the centre
    const cx = w * 0.32, cy = h * 0.45;
    const fW = Math.min(220, w * 0.28);
    const fH = 28;

    // Halo
    const halo = ctx.createRadialGradient(cx, cy, fW * 0.2, cx, cy, fW * 1.3);
    halo.addColorStop(0, this.alpha(hex, 0.65));
    halo.addColorStop(1, this.alpha(hex, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.ellipse(cx, cy, fW * 1.3, fW * 0.9, 0, 0, Math.PI * 2); ctx.fill();

    // Filament body
    ctx.fillStyle = hex;
    ctx.beginPath();
    this.roundRect(ctx, cx - fW / 2, cy - fH / 2, fW, fH, 8);
    ctx.fill();

    // Subtle ink rim
    ctx.strokeStyle = theme.inkAlpha(0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(ctx, cx - fW / 2, cy - fH / 2, fW, fH, 8);
    ctx.stroke();

    // Wires (mounting)
    ctx.strokeStyle = theme.inkAlpha(0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - fW / 2, cy);
    ctx.lineTo(cx - fW / 2 - 30, cy + 80);
    ctx.moveTo(cx + fW / 2, cy);
    ctx.lineTo(cx + fW / 2 + 30, cy + 80);
    ctx.stroke();

    // Spectrum plot — right side
    const px0 = w * 0.58, py0 = h * 0.78;
    const pW = w - px0 - 40, pH = 220;
    const px1 = px0 + pW, py1 = py0 - pH;

    ctx.strokeStyle = axisStyle.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px0, py0); ctx.lineTo(px1, py0);
    ctx.moveTo(px0, py0); ctx.lineTo(px0, py1);
    ctx.stroke();

    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('λ (nm)', px1 - 36, py0 + 14);
    ctx.fillText('B(λ,T)', px0 - 38, py1 + 10);

    // Wavelength tick labels
    [400, 500, 600, 700].forEach((l) => {
      const x = px0 + ((l - 380) / 400) * pW;
      ctx.beginPath(); ctx.moveTo(x, py0); ctx.lineTo(x, py0 + 4); ctx.stroke();
      ctx.fillText(`${l}`, x - 10, py0 + 14);
    });

    // Plot Planck curve, normalize peak to box height
    const samples: { lambda: number; B: number }[] = [];
    for (let l = 380; l <= 780; l += 5) {
      samples.push({ lambda: l, B: planckRadiance(l * 1e-9, this.T) });
    }
    const peakB = Math.max(...samples.map((s) => s.B), 1e-12);

    // Fill under curve with spectrum gradient
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    for (const s of samples) {
      const x = px0 + ((s.lambda - 380) / 400) * pW;
      const y = py0 - (s.B / peakB) * pH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(px1, py0);
    ctx.closePath();
    // Approximate spectrum colour gradient
    const grad = ctx.createLinearGradient(px0, 0, px1, 0);
    grad.addColorStop(0,    '#5b3aa6'); // 380 violet
    grad.addColorStop(0.18, '#3559b8'); // 450 blue
    grad.addColorStop(0.30, '#4ab4a3'); // 500 cyan
    grad.addColorStop(0.45, '#7bc14a'); // 550 green
    grad.addColorStop(0.55, '#cdb04a'); // 580 yellow
    grad.addColorStop(0.65, '#cd7a3a'); // 600 orange
    grad.addColorStop(0.85, '#a8332a'); // 650 red
    grad.addColorStop(1,    '#5d1f1c'); // 700+ deep red
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Curve outline
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const x = px0 + ((s.lambda - 380) / 400) * pW;
      const y = py0 - (s.B / peakB) * pH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Readout
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`T = ${Math.round(this.T)} K`, 24, 36);
    ctx.fillText(`color = ${hex}`, 24, 58);
  }

  private alpha(hex: string, a: number) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return `rgba(0,0,0,${a})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${a})`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}

void rgbToCssRgb;
window.addEventListener('DOMContentLoaded', () => new FilamentHeating());
