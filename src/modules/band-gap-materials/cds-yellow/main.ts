import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss, drawBandDiagram } from '@core/render/molecular';

function eg(sizeNm: number): number {
  // Bulk CdS Eg=2.42 eV; confinement adds ~0.6 (R0/R)² with R0~3nm
  return 2.42 + 0.5 * Math.pow(3 / Math.max(3, sizeNm), 2);
}

class CdSYellow {
  private stage: CanvasStage;
  private size = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.size = hydrateNumber('size', 20);
    const s = document.getElementById('size') as EncSlider; s.value = this.size;
    s.addEventListener('input', (e) => { this.size = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('size', () => Math.round(this.size));
    document.addEventListener('reset-params', () => { this.size = 20; s.value = 20; this.draw(); notifyStateChange(); });
  }

  private observedCss(Eg: number): string {
    const edge = 1240 / Eg;
    if (edge < 380) return '#f5f3ec';
    if (edge > 780) return '#2a2a2e';
    let r = 0, g = 0, b = 0, n = 0;
    for (let l = edge; l < 780; l += 5) {
      const css = wavelengthCss(l);
      const m = css.match(/rgb\((\d+),(\d+),(\d+)\)/)!;
      r += +m[1]; g += +m[2]; b += +m[3]; n++;
    }
    return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const E = eg(this.size);
    const edge = 1240 / E;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`CdS particle ${this.size} nm · Eg = ${E.toFixed(2)} eV · edge ${edge.toFixed(0)} nm`, M, M);

    // Band diagram
    drawBandDiagram(g, M + 10, M + 30, 240, 220, E, 4);
    // Swatch
    g.fillStyle = this.observedCss(E);
    g.fillRect(M + 280, M + 30, 200, 220);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M + 280, M + 30, 200, 220);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('CdS pigment', M + 380, M + 270);

    // Spectrum strip
    const sy = M + 290, sx = M, sw = w - 2 * M, sh = 50;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('visible spectrum · edge at λ_edge', sx, sy - 4);
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 400;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    if (edge > 380 && edge < 780) {
      const xEdge = sx + ((edge - 380) / 400) * sw;
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(sx, sy, xEdge - sx, sh);
      g.strokeStyle = theme.crimson; g.lineWidth = 2;
      g.beginPath(); g.moveTo(xEdge, sy); g.lineTo(xEdge, sy + sh); g.stroke();
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(sx, sy, sw, sh);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Below ~5 nm, quantum confinement raises Eg above 2.7 eV — particles glow greenish-yellow → green. Same crystal, different visual identity.', M, h - M);
  }
}

new CdSYellow();
