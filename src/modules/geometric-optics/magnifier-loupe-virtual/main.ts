import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const F = 180; // converging lens focal length (px)

class Loupe {
  private stage: CanvasStage;
  private d = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 80);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 80; s.value = 80; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const cy = h / 2;
    // Lens at x = lx
    const lx = w * 0.55;
    // Object at lx - d (to the left of lens)
    const ox = lx - this.d;
    const oH = 50;
    // Thin lens: 1/f = 1/d_o + 1/d_i → 1/d_i = 1/f − 1/d_o
    const inv_di = 1 / F - 1 / this.d;
    const di = 1 / inv_di;
    const mag = -di / this.d;
    const isVirtual = di < 0;
    const ix = lx + di; // for virtual, di<0 → ix < lx (same side as object)
    const iH = oH * Math.abs(mag) * (isVirtual ? 1 : -1); // virtual upright

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`f=${F}px · d_o=${this.d}px · d_i=${di.toFixed(1)}px · m=${mag.toFixed(2)}× · image ${isVirtual ? 'VIRTUAL upright (loupe ✓)' : 'REAL inverted (not a loupe)'}`, M, M);

    // Optical axis
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(M, cy); g.lineTo(w - M, cy); g.stroke(); g.setLineDash([]);
    // Lens (vertical line + arrows)
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(lx, cy - 100); g.lineTo(lx, cy + 100); g.stroke();
    g.beginPath(); g.moveTo(lx - 6, cy - 92); g.lineTo(lx, cy - 100); g.lineTo(lx + 6, cy - 92); g.stroke();
    g.beginPath(); g.moveTo(lx - 6, cy + 92); g.lineTo(lx, cy + 100); g.lineTo(lx + 6, cy + 92); g.stroke();
    // F markers
    g.fillStyle = theme.crimson;
    g.beginPath(); g.arc(lx - F, cy, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(lx + F, cy, 4, 0, Math.PI * 2); g.fill();
    g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('F', lx - F, cy + 18); g.fillText('F', lx + F, cy + 18);

    // Object arrow
    g.strokeStyle = '#1f3a8a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(ox, cy); g.lineTo(ox, cy - oH); g.stroke();
    g.beginPath(); g.moveTo(ox - 6, cy - oH + 8); g.lineTo(ox, cy - oH); g.lineTo(ox + 6, cy - oH + 8); g.stroke();
    g.fillStyle = '#1f3a8a'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('object', ox, cy + 18);

    // Principal rays from object tip
    const tipX = ox, tipY = cy - oH;
    // Ray 1: parallel to axis → through F on right
    g.strokeStyle = '#c2382c'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(lx, tipY); g.stroke();
    // After lens: goes through (lx+F, cy)
    const slope1 = (cy - tipY) / F;
    g.beginPath(); g.moveTo(lx, tipY); g.lineTo(w - M, tipY + slope1 * (w - M - lx)); g.stroke();
    // Virtual extension behind lens (dashed)
    if (isVirtual) {
      g.strokeStyle = '#c2382c'; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(lx, tipY); g.lineTo(ix, cy - iH); g.stroke();
      g.setLineDash([]);
    }
    // Ray 2: through centre of lens, undeviated
    g.strokeStyle = '#1a6a3a'; g.lineWidth = 1.5;
    const slope2 = (cy - tipY) / (lx - tipX);
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(w - M, tipY + slope2 * (w - M - tipX)); g.stroke();

    // Image arrow
    if (isVirtual && ix < lx) {
      g.strokeStyle = '#8030c0'; g.lineWidth = 3; g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(ix, cy); g.lineTo(ix, cy - iH); g.stroke();
      g.beginPath(); g.moveTo(ix - 6, cy - iH + 8); g.lineTo(ix, cy - iH); g.lineTo(ix + 6, cy - iH + 8); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#8030c0'; g.font = 'bold 11px serif';
      g.fillText('virtual image (enlarged, upright)', ix, cy - iH - 8);
    } else {
      g.strokeStyle = '#3a76a8'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(ix, cy); g.lineTo(ix, cy - iH); g.stroke();
      g.beginPath(); g.moveTo(ix - 6, cy - iH - Math.sign(iH) * 8); g.lineTo(ix, cy - iH); g.lineTo(ix + 6, cy - iH - Math.sign(iH) * 8); g.stroke();
      g.fillStyle = '#3a76a8'; g.font = 'bold 11px serif';
      g.fillText('real image (inverted)', ix, cy + 28);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Move object inside the focal point (d_o < f) for true loupe behaviour: virtual, upright, magnified image on the object side.', M, h - M);
  }
}

new Loupe();
