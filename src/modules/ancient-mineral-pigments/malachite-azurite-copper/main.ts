import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class CopperPigments {
  private stage: CanvasStage;
  private w = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.w = hydrateNumber('w', 0);
    const s = document.getElementById('w') as EncSlider; s.value = this.w;
    s.addEventListener('input', (e) => { this.w = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('w', () => this.w.toFixed(2));
    document.addEventListener('reset-params', () => { this.w = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private blend(t: number): string {
    const a = { r: 0x2a, g: 0x4a, b: 0x9a };
    const b = { r: 0x20, g: 0x80, b: 0x4a };
    const R = Math.round(a.r * (1 - t) + b.r * t);
    const G = Math.round(a.g * (1 - t) + b.g * t);
    const B = Math.round(a.b * (1 - t) + b.b * t);
    return `rgb(${R},${G},${B})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.blend(this.w);
    const pigment = this.w < 0.5 ? 'azurite Cu₃(CO₃)₂(OH)₂' : 'malachite Cu₂CO₃(OH)₂';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Weathering ${(this.w * 100).toFixed(0)} % · current ${pigment} → ${col}`, M, M);

    // Madonna mantle scene
    const sx = M, sy = M + 30, sw = (w - 2 * M) * 0.5, sh = h - 2 * M - 70;
    g.fillStyle = '#f3e9d4'; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    // Sky band (where azurite used to be — now blended)
    g.fillStyle = col;
    g.fillRect(sx + 20, sy + 20, sw - 40, sh * 0.45);
    // Mantle on figure (also blended)
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(sx + sw / 2, sy + sh * 0.78, sw * 0.32, sh * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    // Face
    g.fillStyle = '#e8c6a8';
    g.beginPath();
    g.ellipse(sx + sw / 2, sy + sh * 0.6, sw * 0.1, sh * 0.12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Madonna scene — sky and mantle painted with copper pigment', sx + sw / 2, sy + sh + 16);

    // Chemical schematic (right)
    const rx = sx + sw + 30, ry = sy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('Cu²⁺ basic carbonate', rx, ry);

    // Azurite molecule sketch
    const ax = rx + 40, ay = ry + 60;
    g.fillStyle = '#3a76a8'; g.beginPath(); g.arc(ax, ay, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 10px serif'; g.textAlign = 'center';
    g.fillText('Cu', ax, ay + 3);
    g.fillStyle = '#3a76a8'; g.beginPath(); g.arc(ax + 30, ay - 14, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillText('Cu', ax + 30, ay - 11);
    g.fillStyle = '#3a76a8'; g.beginPath(); g.arc(ax + 30, ay + 14, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillText('Cu', ax + 30, ay + 17);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('3 Cu : 2 CO₃ → azurite', rx, ry + 90);

    // Malachite
    const mx = rx + 40, my = ry + 140;
    g.fillStyle = '#20804a'; g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 10px serif'; g.textAlign = 'center';
    g.fillText('Cu', mx, my + 3);
    g.fillStyle = '#20804a'; g.beginPath(); g.arc(mx + 30, my, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillText('Cu', mx + 30, my + 3);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('2 Cu : 1 CO₃ → malachite', rx, ry + 170);

    // Arrow
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath(); g.moveTo(rx + 90, ry + 90); g.lineTo(rx + 90, ry + 130);
    g.lineTo(rx + 86, ry + 124); g.moveTo(rx + 90, ry + 130); g.lineTo(rx + 94, ry + 124); g.stroke();
    g.fillStyle = theme.crimson; g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('humid air, decades', rx + 100, ry + 112);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Why old Madonna skies look green: azurite → malachite is the slow hydrolysis you can see in 15-th-century altarpieces.', M, h - M);
  }
}

new CopperPigments();
