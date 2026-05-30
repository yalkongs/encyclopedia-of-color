import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class LeucoVat {
  private stage: CanvasStage;
  private r = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.r = hydrateNumber('r', 0);
    const s = document.getElementById('r') as EncSlider; s.value = this.r;
    s.addEventListener('input', (e) => { this.r = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('r', () => this.r.toFixed(2));
    document.addEventListener('reset-params', () => { this.r = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private blendColor(r: number): string {
    // r = 0: leuco yellow-green (#c8c850), r = 1: indigotin blue (#1f3a8a)
    const a = { r: 0xc8, g: 0xc8, b: 0x50 };
    const b = { r: 0x1f, g: 0x3a, b: 0x8a };
    const R = Math.round(a.r * (1 - r) + b.r * r);
    const G = Math.round(a.g * (1 - r) + b.g * r);
    const B = Math.round(a.b * (1 - r) + b.b * r);
    return `rgb(${R},${G},${B})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.blendColor(this.r);
    const stateName = this.r < 0.3 ? 'reduced leuco (soluble)' : this.r < 0.7 ? 'oxidising on fibre' : 'oxidised indigotin (insoluble blue)';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`redox = ${this.r.toFixed(2)} · ${stateName}`, M, M);

    // Vat (left): half-elliptical bath with cloth dipped
    const vx = M, vy = M + 40, vw = 280, vh = 280;
    g.fillStyle = '#d0c8b0'; g.fillRect(vx, vy, vw, vh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(vx, vy, vw, vh);
    // Vat liquid (always yellow-green inside the vat — only fibre oxidises)
    g.fillStyle = '#c8c850';
    g.fillRect(vx + 30, vy + 80, vw - 60, vh - 110);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(vx + 30, vy + 80, vw - 60, vh - 110);
    // Bubble ripples
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.beginPath(); g.arc(vx + 80, vy + 110, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(vx + 140, vy + 100, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(vx + 200, vy + 115, 5, 0, Math.PI * 2); g.fill();

    // Cloth (rope dyer style) — half in vat half out
    const ropeX = vx + vw / 2;
    g.lineWidth = 18; g.lineCap = 'round';
    // submerged portion (yellow-green leuco)
    g.strokeStyle = '#c8c850';
    g.beginPath(); g.moveTo(ropeX, vy + 80); g.lineTo(ropeX, vy + vh - 30); g.stroke();
    // emerging portion (blends to blue as r rises)
    g.strokeStyle = col;
    g.beginPath(); g.moveTo(ropeX, vy + 80); g.lineTo(ropeX, vy + 30); g.stroke();
    g.beginPath(); g.moveTo(ropeX, vy + 30); g.lineTo(ropeX + 60, vy - 10); g.stroke();
    g.lineCap = 'butt';

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('rope dyer — fibre lifted into air re-oxidises to blue', vx + vw / 2, vy + vh + 18);

    // Right side: redox equilibrium schematic
    const sx = vx + vw + 40, sy = vy;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('redox equilibrium', sx, sy);

    // Leuco molecule (yellow box)
    const lx = sx, ly = sy + 30, ls = 90;
    g.fillStyle = '#c8c850'; g.fillRect(lx, ly, ls, ls);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(lx, ly, ls, ls);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('leuco-indigo', lx + ls / 2, ly + ls / 2 - 4);
    g.fillText('(OH groups, soluble)', lx + ls / 2, ly + ls / 2 + 12);

    // Indigotin (blue box)
    const ix = lx + ls + 80, iy = ly;
    g.fillStyle = '#1f3a8a'; g.fillRect(ix, iy, ls, ls);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(ix, iy, ls, ls);
    g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('indigotin', ix + ls / 2, iy + ls / 2 - 4);
    g.fillText('(C=O, insoluble)', ix + ls / 2, iy + ls / 2 + 12);

    // Forward arrow (reduction)
    g.strokeStyle = theme.inkAlpha(0.7); g.lineWidth = 2;
    g.beginPath(); g.moveTo(ix - 6, iy + 30); g.lineTo(lx + ls + 6, ly + 30);
    g.lineTo(lx + ls + 12, ly + 26); g.moveTo(lx + ls + 6, ly + 30); g.lineTo(lx + ls + 12, ly + 34); g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('+ 2 H  (reducer)', (lx + ls + ix) / 2, ly + 20);

    // Reverse arrow (oxidation)
    g.beginPath(); g.moveTo(lx + ls + 6, ly + 60); g.lineTo(ix - 6, iy + 60);
    g.lineTo(ix - 12, iy + 56); g.moveTo(ix - 6, iy + 60); g.lineTo(ix - 12, iy + 64); g.stroke();
    g.fillText('+ ½ O₂  (air)', (lx + ls + ix) / 2, ly + 80);

    // Position indicator (where r is now)
    g.fillStyle = theme.crimson;
    const px = lx + ls / 2 + (ix + ls / 2 - lx - ls / 2) * this.r;
    g.beginPath(); g.arc(px, ly + ls + 30, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('current state', px, ly + ls + 50);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Historically: stale urine (ammonia + bacteria) reduced the dye. Modern industry uses sodium dithionite. Same equilibrium.', M, h - M);
  }
}

new LeucoVat();
