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

const SF_MIN = 0.5, SF_MAX = 40;

function magno(sf: number, chromatic: boolean): number {
  return Math.exp(-Math.pow(sf / 4, 1.3)) * (chromatic ? 0.04 : 1);
}
function parvo(sf: number): number {
  return Math.exp(-Math.pow(sf / 22, 2)) * Math.min(1, sf / 2.2);
}

class MvsP {
  private stage: CanvasStage;
  private sf = 2;
  private stim = 'lum';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sf = hydrateNumber('sf', 2);
    this.stim = hydrateFromUrl('stim') ?? 'lum';
    (document.getElementById('sf') as EncSlider).value = this.sf;
    (document.getElementById('stim') as EncToggle).value = this.stim;
    registerStateParam('sf', () => this.sf);
    registerStateParam('stim', () => this.stim);
    (document.getElementById('sf') as EncSlider).addEventListener('input', (e) => {
      this.sf = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('stim') as EncToggle).addEventListener('change', (e) => {
      this.stim = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.sf = 2; this.stim = 'lum';
      (document.getElementById('sf') as EncSlider).value = 2;
      (document.getElementById('stim') as EncToggle).value = 'lum';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const chromatic = this.stim === 'color';

    // --- Top: the two cells with property lists. ---
    const topY = h * 0.20;
    const mX = w * 0.22, pX = w * 0.22;
    ctx.fillStyle = theme.slateAlpha(0.5);
    ctx.beginPath(); ctx.arc(mX, topY, 24, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = theme.crimsonAlpha(0.5);
    ctx.beginPath(); ctx.arc(pX, h * 0.5, 10, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.crimson; ctx.stroke();

    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = theme.slate; ctx.fillText('Magnocellular', mX + 36, topY - 6);
    ctx.fillStyle = theme.crimson; ctx.fillText('Parvocellular', pX + 36, h * 0.5 - 2);
    ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = theme.inkMute;
    ctx.fillText('large field · fast/transient · achromatic · coarse', mX + 36, topY + 12);
    ctx.fillText('small field · slow/sustained · colour · fine detail', pX + 36, h * 0.5 + 14);

    // --- Bottom: contrast sensitivity vs spatial frequency (log x). ---
    const padL = 50, padR = 24, padB = 50;
    const plotX = padL, plotW = w - padL - padR;
    const plotY = h * 0.62, plotH = h - plotY - padB;
    const lx = (sf: number) => Math.log(sf);
    const xOf = (sf: number) => plotX + ((lx(sf) - lx(SF_MIN)) / (lx(SF_MAX) - lx(SF_MIN))) * plotW;
    const yOf = (v: number) => plotY + (1 - v) * plotH;

    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const sf of [0.5, 1, 2, 5, 10, 20, 40]) {
      const x = xOf(sf);
      ctx.strokeStyle = axisStyle.grid; ctx.beginPath(); ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH); ctx.stroke();
      ctx.fillStyle = axisStyle.label; ctx.fillText(String(sf), x, plotY + plotH + 15);
    }
    ctx.fillText('spatial frequency (cyc/deg)', plotX + plotW / 2, plotY + plotH + 32);
    ctx.textAlign = 'left';

    const curve = (f: (sf: number) => number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      let first = true;
      for (let px = 0; px <= plotW; px++) {
        const sf = Math.exp(lx(SF_MIN) + (px / plotW) * (lx(SF_MAX) - lx(SF_MIN)));
        const X = plotX + px, Y = yOf(f(sf));
        if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    };
    curve((sf) => magno(sf, chromatic), theme.slate);
    curve(parvo, theme.crimson);

    // Current SF marker + dominance.
    const m = magno(this.sf, chromatic), p = parvo(this.sf);
    const mx2 = xOf(this.sf);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx2, plotY); ctx.lineTo(mx2, plotY + plotH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.slate; ctx.beginPath(); ctx.arc(mx2, yOf(m), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = theme.crimson; ctx.beginPath(); ctx.arc(mx2, yOf(p), 4, 0, 2 * Math.PI); ctx.fill();

    const winner = m > p ? 'magnocellular dominates — coarse & fast' : 'parvocellular dominates — fine detail & colour';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${this.sf.toFixed(1)} cyc/deg → ${winner}`, plotX, plotY - 10);
  }
}
window.addEventListener('DOMContentLoaded', () => new MvsP());
