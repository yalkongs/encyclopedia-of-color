import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Brand { name: string; pms: string; hueDeg: number; sat: number; val: number; }

const BRANDS: Brand[] = [
  { name: 'Coca-Cola', pms: 'PMS 484', hueDeg: 8, sat: 0.92, val: 0.83 },
  { name: 'Tiffany & Co', pms: 'PMS 1837', hueDeg: 175, sat: 0.65, val: 0.85 },
  { name: 'T-Mobile', pms: 'PMS 219', hueDeg: 322, sat: 0.85, val: 0.85 },
  { name: 'UPS', pms: 'Pullman Brown', hueDeg: 28, sat: 0.85, val: 0.43 },
];

function hsvCss(h: number, s: number, v: number): string {
  const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c;
  let r0 = 0, g0 = 0, b0 = 0;
  if (h < 60) [r0, g0, b0] = [c, x, 0];
  else if (h < 120) [r0, g0, b0] = [x, c, 0];
  else if (h < 180) [r0, g0, b0] = [0, c, x];
  else if (h < 240) [r0, g0, b0] = [0, x, c];
  else if (h < 300) [r0, g0, b0] = [x, 0, c];
  else [r0, g0, b0] = [c, 0, x];
  return `rgb(${Math.round((r0 + m) * 255)},${Math.round((g0 + m) * 255)},${Math.round((b0 + m) * 255)})`;
}

class BrandRecall {
  private stage: CanvasStage;
  private d = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 0);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Recall accuracy: peak 0.95 at 0° offset, falls off ~ Gaussian to 0.3 at 60°
    const recall = 0.3 + 0.65 * Math.exp(-(this.d * this.d) / (2 * 20 * 20));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`hue offset ${this.d}° · expected brand-recall accuracy ${(recall * 100).toFixed(0)} %`, M, M);

    // Brand swatches grid (rows = brands)
    const gx = M, gy = M + 40;
    const rowH = 60;
    for (let i = 0; i < BRANDS.length; i++) {
      const b = BRANDS[i];
      const ry = gy + i * rowH;
      // Brand name
      g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
      g.fillText(b.name, gx, ry + 26);
      g.font = '11px serif'; g.fillStyle = theme.inkAlpha(0.6);
      g.fillText(b.pms, gx + 130, ry + 26);
      // Correct swatch (left)
      const sw = 80, sh = 44;
      g.fillStyle = hsvCss(b.hueDeg, b.sat, b.val);
      g.fillRect(gx + 220, ry + 4, sw, sh);
      g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(gx + 220, ry + 4, sw, sh);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('exact', gx + 220 + sw / 2, ry + sh + 16);
      // Offset swatch (right)
      g.fillStyle = hsvCss((b.hueDeg + this.d + 360) % 360, b.sat, b.val);
      g.fillRect(gx + 220 + sw + 30, ry + 4, sw, sh);
      g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(gx + 220 + sw + 30, ry + 4, sw, sh);
      g.fillStyle = theme.inkAlpha(0.7); g.fillText(`+${this.d}°`, gx + 220 + sw + 30 + sw / 2, ry + sh + 16);
    }

    // Recall curve
    const cy = gy + BRANDS.length * rowH + 30, cw = w - 2 * M, ch = 80;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(M, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('recall accuracy vs hue offset', M, cy - 4);
    const X = (d: number) => M + (d / 60) * cw;
    const Y = (r: number) => cy + (1 - r) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let dd = 0; dd <= 60; dd++) {
      const r = 0.3 + 0.65 * Math.exp(-(dd * dd) / (2 * 20 * 20));
      const x = X(dd), y = Y(r);
      if (dd === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.d), Y(recall), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.65); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('0° (exact match)', M, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('60° offset', M + cw, cy + ch + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Pantone trademark-protected colours: tiny manufacturing tolerances matter for legal "passing-off" cases.', M, h - M);
  }
}

new BrandRecall();
