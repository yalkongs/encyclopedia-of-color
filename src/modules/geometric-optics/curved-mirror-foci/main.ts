import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const R = 300; // concave mirror radius (px)
const F = R / 2;

class CurvedMirror {
  private stage: CanvasStage;
  private d = 200;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.d = hydrateNumber('d', 200);
    const s = document.getElementById('d') as EncSlider; s.value = this.d;
    s.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => { this.d = 200; s.value = 200; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Mirror at the right: vertex at mx
    const mx = w - M - 40;
    const cy = h / 2;
    // Object on the left at distance d_o from mirror
    const ox = mx - this.d;
    const oH = 60;
    // Mirror equation: 1/d_o + 1/d_i = 1/F → d_i = (F·d_o)/(d_o − F)
    const di = (F * this.d) / (this.d - F);
    const mag = -di / this.d;
    const isVirtual = di < 0;
    const ix = mx - di; // image position (negative d_i → behind mirror, ix > mx)
    const iH = oH * mag;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`d_o=${this.d}px · f=${F}px · d_i=${di.toFixed(1)}px · m=${mag.toFixed(2)} · image ${isVirtual ? 'VIRTUAL upright' : 'REAL inverted'}`, M, M);

    // Optical axis
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([4, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(M, cy); g.lineTo(w - M, cy); g.stroke(); g.setLineDash([]);

    // Mirror curve (arc)
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 3;
    g.beginPath(); g.arc(mx + R, cy, R, Math.PI - 0.3, Math.PI + 0.3, false); g.stroke();
    // Hatching behind mirror
    g.strokeStyle = theme.inkAlpha(0.3); g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      g.beginPath(); g.moveTo(mx + 4, cy + i * 10); g.lineTo(mx + 14, cy + i * 10 + 6); g.stroke();
    }

    // F and C labels
    g.fillStyle = theme.crimson; g.beginPath(); g.arc(mx - F, cy, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.crimson; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('F', mx - F, cy + 18);
    g.fillStyle = '#1a6a3a'; g.beginPath(); g.arc(mx - R, cy, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a6a3a';
    g.fillText('C', mx - R, cy + 18);

    // Object (upward arrow)
    g.strokeStyle = '#1f3a8a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(ox, cy); g.lineTo(ox, cy - oH); g.stroke();
    g.beginPath(); g.moveTo(ox - 6, cy - oH + 8); g.lineTo(ox, cy - oH); g.lineTo(ox + 6, cy - oH + 8); g.stroke();
    g.fillStyle = '#1f3a8a'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('object', ox, cy + 18);

    // Principal rays from object tip
    const tipX = ox, tipY = cy - oH;
    // Ray 1: parallel to axis → reflects through F
    g.strokeStyle = '#c2382c'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(mx, tipY); g.stroke();
    g.beginPath(); g.moveTo(mx, tipY); g.lineTo(mx - F * 2, cy + (mx - F * 2 - mx) * (cy - tipY) / (mx - F - mx)); g.stroke();
    // Better: reflect through F point: line from (mx, tipY) → (mx - F, cy)
    g.beginPath(); g.moveTo(mx, tipY);
    const slope1 = (cy - tipY) / (mx - F - mx);
    g.lineTo(mx - 500, tipY + slope1 * (-500)); g.stroke();
    // Ray 2: through F → reflects parallel to axis
    g.strokeStyle = '#1a6a3a'; g.lineWidth = 1.5;
    const slope2 = (cy - tipY) / (mx - F - tipX);
    const yOnMirror2 = tipY + slope2 * (mx - tipX);
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(mx, yOnMirror2); g.stroke();
    g.beginPath(); g.moveTo(mx, yOnMirror2); g.lineTo(mx - 500, yOnMirror2); g.stroke();
    // Ray 3: through C → reflects back on itself
    g.strokeStyle = '#c8a020'; g.lineWidth = 1.5; g.setLineDash([3, 3]);
    const slope3 = (cy - tipY) / (mx - R - tipX);
    const yOnMirror3 = tipY + slope3 * (mx - tipX);
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(mx, yOnMirror3); g.stroke();
    g.setLineDash([]);

    // Image
    g.strokeStyle = isVirtual ? '#8030c0' : '#3a76a8'; g.lineWidth = 3;
    g.setLineDash(isVirtual ? [4, 3] : []);
    g.beginPath(); g.moveTo(ix, cy); g.lineTo(ix, cy - iH); g.stroke();
    g.beginPath(); g.moveTo(ix - 6, cy - iH + Math.sign(iH) * 8); g.lineTo(ix, cy - iH); g.lineTo(ix + 6, cy - iH + Math.sign(iH) * 8); g.stroke();
    g.setLineDash([]);
    g.fillStyle = isVirtual ? '#8030c0' : '#3a76a8'; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText(isVirtual ? 'virtual image' : 'real image', ix, cy + (iH > 0 ? -iH - 6 : 30));

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Three principal rays: parallel→F, through-F→parallel, through-C→retraces. They intersect at the image point.', M, h - M);
  }
}

new CurvedMirror();
