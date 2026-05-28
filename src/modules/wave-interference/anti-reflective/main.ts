import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { thinFilmReflectanceGeneral } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LMIN = 380, LMAX = 780;

class AntiReflective {
  private stage: CanvasStage;
  private n1 = 1.23;
  private d = 112;
  private n2 = 1.52;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n1 = hydrateNumber('n1', 1.23);
    this.d = hydrateNumber('d', 112);
    this.n2 = hydrateNumber('n2', 1.52);
    (document.getElementById('n1') as EncSlider).value = this.n1;
    (document.getElementById('d') as EncSlider).value = this.d;
    (document.getElementById('n2') as EncSlider).value = this.n2;
    registerStateParam('n1', () => this.n1);
    registerStateParam('d', () => this.d);
    registerStateParam('n2', () => this.n2);
    for (const id of ['n1', 'd', 'n2']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'n1') this.n1 = v;
        else if (id === 'd') this.d = v;
        else this.n2 = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.n1 = 1.23; this.d = 112; this.n2 = 1.52;
      (document.getElementById('n1') as EncSlider).value = 1.23;
      (document.getElementById('d') as EncSlider).value = 112;
      (document.getElementById('n2') as EncSlider).value = 1.52;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 48;
    const plotX = pad + 8, plotY = pad - 14;
    const plotW = w - pad * 2, plotH = h - pad * 2.2;

    // Y range fixed 0..8% reflectance.
    const Rmax = 0.08;
    const xOf = (l: number) => plotX + ((l - LMIN) / (LMAX - LMIN)) * plotW;
    const yOf = (R: number) => plotY + (1 - Math.min(R, Rmax) / Rmax) * plotH;

    // Visible spectrum background.
    const grad = ctx.createLinearGradient(plotX, 0, plotX + plotW, 0);
    grad.addColorStop(0.00, 'rgba(70,0,130,0.06)');
    grad.addColorStop(0.30, 'rgba(0,0,255,0.06)');
    grad.addColorStop(0.55, 'rgba(0,180,0,0.06)');
    grad.addColorStop(0.75, 'rgba(255,200,0,0.07)');
    grad.addColorStop(1.00, 'rgba(190,0,0,0.06)');
    ctx.fillStyle = grad; ctx.fillRect(plotX, plotY, plotW, plotH);

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();

    // Bare-glass reference reflectance (single interface, normal incidence).
    const Rbare = ((1 - this.n2) / (1 + this.n2)) ** 2;
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(plotX, yOf(Rbare)); ctx.lineTo(plotX + plotW, yOf(Rbare)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`bare glass  ${(Rbare * 100).toFixed(1)}%`, plotX + plotW - 120, yOf(Rbare) - 6);

    // Coated reflectance curve + find the minimum.
    let minR = Infinity, minLam = LMIN;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const l = LMIN + (LMAX - LMIN) * (i / 240);
      const R = thinFilmReflectanceGeneral(l, this.d, 1.0, this.n1, this.n2);
      if (R < minR) { minR = R; minLam = l; }
      const px = xOf(l), py = yOf(R);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Minimum marker.
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(xOf(minLam), yOf(minR), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.goldAlpha(0.5); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(minLam), yOf(minR)); ctx.lineTo(xOf(minLam), plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Axis labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let l = 400; l <= 700; l += 100) ctx.fillText(`${l}`, xOf(l) - 10, plotY + plotH + 13);
    for (let p = 0; p <= 8; p += 2) ctx.fillText(`${p}%`, plotX - 28, yOf(p / 100) + 3);

    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('λ (nm)', plotX + plotW * 0.45, plotY + plotH + 26);
    ctx.save(); ctx.translate(plotX - 32, plotY + plotH * 0.5); ctx.rotate(-Math.PI / 2);
    ctx.fillText('reflectance R', -48, 0); ctx.restore();

    // Readouts.
    const idealN = Math.sqrt(1.0 * this.n2);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`min R = ${(minR * 100).toFixed(2)}%  at λ = ${minLam.toFixed(0)} nm`, plotX + 6, plotY + 16);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`ideal n₁ = √n₂ = ${idealN.toFixed(3)}  (you set ${this.n1.toFixed(2)})`, plotX + 6, plotY + 34);
  }
}
window.addEventListener('DOMContentLoaded', () => new AntiReflective());
