import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { vPhotopic, vScotopic } from '@core/math/photometry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 380, LMAX = 720;

class PhotopicScotopic {
  private stage: CanvasStage;
  private adapt = 0.0; // 0 day (photopic), 1 night (scotopic)

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.adapt = hydrateNumber('adapt', 0.0);
    (document.getElementById('adapt') as EncSlider).value = this.adapt;
    registerStateParam('adapt', () => this.adapt);
    (document.getElementById('adapt') as EncSlider).addEventListener('input', (e) => {
      this.adapt = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.adapt = 0.0;
      (document.getElementById('adapt') as EncSlider).value = 0.0;
      this.draw(); notifyStateChange();
    });
  }

  // Blended luminous efficiency (peak-normalised photopic & scotopic).
  private vBlend(lam: number): number {
    return (1 - this.adapt) * vPhotopic(lam) + this.adapt * vScotopic(lam);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 48;
    const plotX = pad + 6, plotY = pad - 8, plotW = w - pad * 2 - w * 0.14, plotH = h - pad * 2.3;

    // Spectrum tint.
    const grad = ctx.createLinearGradient(plotX, 0, plotX + plotW, 0);
    grad.addColorStop(0.00, 'rgba(70,0,130,0.08)');
    grad.addColorStop(0.32, 'rgba(0,0,255,0.08)');
    grad.addColorStop(0.55, 'rgba(0,180,0,0.08)');
    grad.addColorStop(0.78, 'rgba(255,200,0,0.09)');
    grad.addColorStop(1.00, 'rgba(190,0,0,0.08)');
    ctx.fillStyle = grad; ctx.fillRect(plotX, plotY, plotW, plotH);

    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    const drawCurve = (fn: (l: number) => number, col: string, width: number, dash: number[]) => {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 300; i++) {
        const l = LMIN + (LMAX - LMIN) * (i / 300);
        const px = xOf(l), py = yOf(fn(l));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    // Reference curves (faint), then blended (bold).
    drawCurve(vPhotopic, theme.crimsonAlpha(0.35), 1.2, [4, 4]);
    drawCurve(vScotopic, theme.slateAlpha(0.5), 1.2, [4, 4]);
    drawCurve((l) => this.vBlend(l), theme.goldDeep, 2.4, []);

    // Peak markers at 555 (photopic) & 507 (scotopic).
    for (const [lp, col, lab] of [[555, theme.crimson, 'V(λ) 555'], [507, theme.slate, "V'(λ) 507"]] as const) {
      ctx.strokeStyle = col; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xOf(lp as number), plotY); ctx.lineTo(xOf(lp as number), plotY + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col as string; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(lab as string, (xOf(lp as number)) - 18, plotY + 12);
    }

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let l = 400; l <= 700; l += 100) ctx.fillText(`${l}`, xOf(l) - 10, plotY + plotH + 14);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('wavelength λ (nm)', plotX + plotW * 0.4, plotY + plotH + 28);
    ctx.save(); ctx.translate(plotX - 30, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('relative sensitivity', plotX < 0 ? -40 : -52, 0); ctx.restore();

    // Red vs blue patches at the chosen adaptation (apparent brightness ∝ V(λ)).
    const redB = this.vBlend(640);
    const blueB = this.vBlend(470);
    const swX = plotX + plotW + 26, swW = w * 0.10, swH = plotH * 0.30;
    const drawPatch = (y: number, baseCol: [number, number, number], bright: number, label: string) => {
      const g = bright;
      ctx.fillStyle = `rgb(${Math.round(baseCol[0] * g)},${Math.round(baseCol[1] * g)},${Math.round(baseCol[2] * g)})`;
      ctx.fillRect(swX, y, swW, swH);
      ctx.strokeStyle = theme.inkAlpha(0.5); ctx.strokeRect(swX, y, swW, swH);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(`${label} ${(bright * 100).toFixed(0)}%`, swX, y + swH + 14);
    };
    drawPatch(plotY + 4, [255, 60, 50], redB, 'red 640');
    drawPatch(plotY + swH + 36, [70, 110, 255], blueB, 'blue 470');

    // Readouts.
    const mode = this.adapt < 0.15 ? 'photopic (daylight, cones)' : this.adapt > 0.85 ? 'scotopic (night, rods)' : 'mesopic (twilight blend)';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`adaptation = ${(this.adapt * 100).toFixed(0)}% night   ·   ${mode}`, plotX + 4, plotY + 8);
    ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(redB < blueB ? 'Purkinje: blue now outshines red' : 'red brighter than blue', plotX + 4, plotY + 28);
  }
}
window.addEventListener('DOMContentLoaded', () => new PhotopicScotopic());
