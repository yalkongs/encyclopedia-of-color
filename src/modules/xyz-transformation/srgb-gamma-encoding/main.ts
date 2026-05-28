import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const srgbEncode = (L: number) => (L <= 0.0031308 ? 12.92 * L : 1.055 * Math.pow(L, 1 / 2.4) - 0.055);

class SrgbGamma {
  private stage: CanvasStage;
  private lin = 20;
  private cmp: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lin = hydrateNumber('lin', 20);
    this.cmp = (hydrateFromUrl('cmp') as 'off' | 'on') ?? 'off';
    (document.getElementById('lin') as EncSlider).value = this.lin;
    (document.getElementById('cmp') as EncToggle).value = this.cmp;
    registerStateParam('lin', () => this.lin);
    registerStateParam('cmp', () => this.cmp);
    (document.getElementById('lin') as EncSlider).addEventListener('input', (e) => {
      this.lin = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('cmp') as EncToggle).addEventListener('change', (e) => {
      this.cmp = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.lin = 20; this.cmp = 'off';
      (document.getElementById('lin') as EncSlider).value = 20;
      (document.getElementById('cmp') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const pad = 50;
    const plotX = pad, plotY = 34, plotW = Math.min(w - pad * 1.4, h - 90), plotH = plotW;
    const xOf = (L: number) => plotX + L * plotW;
    const yOf = (V: number) => plotY + (1 - V) * plotH;

    // Grid + axes.
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let t = 0; t <= 1.0001; t += 0.25) {
      ctx.beginPath(); ctx.moveTo(xOf(t), plotY); ctx.lineTo(xOf(t), plotY + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(plotX, yOf(t)); ctx.lineTo(plotX + plotW, yOf(t)); ctx.stroke();
    }
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(plotX, plotY + plotH); ctx.lineTo(plotX, plotY); ctx.moveTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('linear L', plotX + plotW / 2, plotY + plotH + 20);
    ctx.save(); ctx.translate(plotX - 28, plotY + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('encoded V', 0, 0); ctx.restore();
    ctx.textAlign = 'left';

    // Identity reference.
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(xOf(0), yOf(0)); ctx.lineTo(xOf(1), yOf(1)); ctx.stroke(); ctx.setLineDash([]);

    // Pure gamma 2.2 comparison.
    if (this.cmp === 'on') {
      ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath();
      for (let px = 0; px <= plotW; px++) { const L = px / plotW; const X = plotX + px, Y = yOf(Math.pow(L, 1 / 2.2)); px === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // sRGB curve.
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2; ctx.beginPath();
    for (let px = 0; px <= plotW; px++) { const L = px / plotW; const X = plotX + px, Y = yOf(srgbEncode(L)); px === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();

    // Marker.
    const L = this.lin / 100, V = srgbEncode(L);
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(xOf(L), yOf(V), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();

    // Legend + readout.
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.crimson; ctx.fillText('— sRGB', plotX + plotW - 90, plotY + 14);
    if (this.cmp === 'on') { ctx.fillStyle = theme.slate; ctx.fillText('— γ 2.2', plotX + plotW - 90, plotY + 30); }
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`L = ${L.toFixed(3)}  →  V = ${V.toFixed(3)}${L <= 0.0031308 ? '  (linear toe)' : ''}`, plotX, h - 12);
  }
}
window.addEventListener('DOMContentLoaded', () => new SrgbGamma());
