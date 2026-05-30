import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function mtfCircular(fNorm: number): number {
  if (fNorm >= 1) return 0;
  const f = Math.min(1, Math.max(0, fNorm));
  return (2 / Math.PI) * (Math.acos(f) - f * Math.sqrt(1 - f * f));
}

class MTF {
  private stage: CanvasStage;
  private f = 0.4;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.f = hydrateNumber('f', 0.4);
    const s = document.getElementById('f') as EncSlider; s.value = this.f;
    s.addEventListener('input', (e) => { this.f = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('f', () => this.f.toFixed(2));
    document.addEventListener('reset-params', () => { this.f = 0.4; s.value = 0.4; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const M0 = mtfCircular(this.f);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`f / f_c = ${this.f.toFixed(2)} · MTF = ${M0.toFixed(3)}`, M, M);

    // Input grating + output grating images
    const imW = 240, imH = 100;
    const inX = M, inY = M + 40;
    const periodPx = Math.max(3, 60 / (1 + this.f * 8));
    // Input
    for (let x = 0; x < imW; x++) {
      const v = 0.5 + 0.5 * Math.cos(2 * Math.PI * x / periodPx);
      const ch = Math.round(v * 255);
      g.fillStyle = `rgb(${ch},${ch},${ch})`;
      g.fillRect(inX + x, inY, 1, imH);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(inX, inY, imW, imH);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('input grating (modulation = 1)', inX + imW / 2, inY + imH + 18);

    // Output grating (modulation = MTF)
    const outX = M, outY = inY + imH + 50;
    for (let x = 0; x < imW; x++) {
      const v = 0.5 + 0.5 * M0 * Math.cos(2 * Math.PI * x / periodPx);
      const ch = Math.round(v * 255);
      g.fillStyle = `rgb(${ch},${ch},${ch})`;
      g.fillRect(outX + x, outY, 1, imH);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(outX, outY, imW, imH);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`output grating (modulation = ${M0.toFixed(2)})`, outX + imW / 2, outY + imH + 18);

    // MTF curve
    const cx = M + imW + 40, cy = M + 40, cw = w - cx - M, ch = imH * 2 + 60;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('MTF(f) — circular aperture', cx + cw / 2, cy - 4);
    const X = (ff: number) => cx + ff * cw;
    const Y = (vv: number) => cy + (1 - vv) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 100; i++) {
      const ff = i / 100;
      const v = mtfCircular(ff);
      const x = X(ff), y = Y(v);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    // Marker
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.f), Y(M0), 5, 0, Math.PI * 2); g.fill();
    // 50% line + MTF50 marker
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(cx, Y(0.5)); g.lineTo(cx + cw, Y(0.5)); g.stroke(); g.setLineDash([]);
    // Find MTF50 numerically
    let f50 = 0; for (let i = 100; i >= 0; i--) { if (mtfCircular(i / 100) >= 0.5) { f50 = i / 100; break; } }
    g.strokeStyle = '#3a76a8'; g.lineWidth = 1; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(X(f50), cy); g.lineTo(X(f50), cy + ch); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#3a76a8'; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText(`MTF50 = ${(f50 * 100).toFixed(0)}% f_c`, X(f50), cy + ch + 14);

    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('0 (DC)', cx, cy + ch + 30);
    g.textAlign = 'right'; g.fillText('cutoff f_c', cx + cw, cy + ch + 30);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Lens reviews quote MTF50 in lp/mm; sensor-system MTF is the product of optical-MTF × pixel-MTF × digital filter MTF.', M, h - M);
  }
}

new MTF();
