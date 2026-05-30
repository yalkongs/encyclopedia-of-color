import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Woad {
  private stage: CanvasStage;
  private x = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.x = hydrateNumber('x', 0);
    const s = document.getElementById('x') as EncSlider; s.value = this.x;
    s.addEventListener('input', (e) => { this.x = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('x', () => this.x.toFixed(2));
    document.addEventListener('reset-params', () => { this.x = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const woadYield = 0.5, indigoYield = 3.0;
    const Yld = woadYield * (1 - this.x) + indigoYield * this.x;
    const name = this.x < 0.5 ? 'woad (Isatis tinctoria)' : 'indigo (Indigofera tinctoria)';
    const leafCol = this.x < 0.5 ? '#5a7a45' : '#3a6038';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${name} · effective indigotin yield = ${Yld.toFixed(2)} % by mass`, M, M);

    // Leaf illustration (left)
    const lx = M + 90, ly = M + 110;
    const leafSize = 50 + 20 * this.x;
    g.fillStyle = leafCol;
    g.beginPath();
    g.ellipse(lx, ly, leafSize, leafSize * 0.45, Math.PI / 6, 0, Math.PI * 2);
    g.fill();
    // Vein
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(lx - leafSize * 0.85, ly + leafSize * 0.2);
    g.lineTo(lx + leafSize * 0.85, ly - leafSize * 0.2);
    g.stroke();

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('leaf (relative size = relative dye-per-kg)', lx, ly + 90);

    // Dyed cloth swatch (right of leaf) — saturation scales with yield
    const sx = lx + 150, sy = ly - 70, ss = 140;
    const ind = '#1f3a8a';
    g.fillStyle = ind; g.fillRect(sx, sy, ss, ss);
    // weave
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < ss; i += 3) { g.beginPath(); g.moveTo(sx + i, sy); g.lineTo(sx + i, sy + ss); g.stroke(); }
    for (let j = 0; j < ss; j += 3) { g.beginPath(); g.moveTo(sx, sy + j); g.lineTo(sx + ss, sy + j); g.stroke(); }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy, ss, ss);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('indigo-dyed cloth (denim blue)', sx + ss / 2, sy + ss + 16);

    // Yield bar chart
    const bx = M, by = sy + ss + 60, bw = w - 2 * M, bh = 28;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, bw, bh);
    const fill = (Yld - woadYield) / (indigoYield - woadYield);
    const fillW = (bw - 4) * (this.x);
    g.fillStyle = '#1f3a8a'; g.fillRect(bx + 2, by + 2, fillW, bh - 4);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText(`woad ${woadYield}%`, bx, by + bh + 14);
    g.textAlign = 'right'; g.fillText(`indigo ${indigoYield}%`, bx + bw, by + bh + 14);
    g.textAlign = 'center'; g.fillStyle = theme.ink; g.font = 'bold 12px serif';
    g.fillText(`yield ratio ${(indigoYield / woadYield).toFixed(0)}×`, bx + bw / 2, by + bh + 14);
    void fill;

    // Shared chromophore caption
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Both plants store indigotin as a colourless glycoside; fermentation hydrolyses it and air oxidation regenerates the blue.', M, h - M);
  }
}

new Woad();
