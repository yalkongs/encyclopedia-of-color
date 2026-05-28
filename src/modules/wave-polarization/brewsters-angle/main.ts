import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { DEG, RAD } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function fresnel(n1: number, n2: number, thetaRad: number): { Rs: number; Rp: number } {
  const cos1 = Math.cos(thetaRad);
  const sin2 = (n1 / n2) * Math.sin(thetaRad);
  if (Math.abs(sin2) > 1) return { Rs: 1, Rp: 1 };
  const cos2 = Math.sqrt(1 - sin2 * sin2);
  const rs = (n1 * cos1 - n2 * cos2) / (n1 * cos1 + n2 * cos2);
  const rp = (n2 * cos1 - n1 * cos2) / (n2 * cos1 + n1 * cos2);
  return { Rs: rs * rs, Rp: rp * rp };
}

class Brewster {
  private stage: CanvasStage;
  private n1 = 1.00;
  private n2 = 1.50;
  private theta = 56;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n1 = hydrateNumber('n1', 1.00);
    this.n2 = hydrateNumber('n2', 1.50);
    this.theta = hydrateNumber('theta', 56);
    (document.getElementById('n1') as EncSlider).value = this.n1;
    (document.getElementById('n2') as EncSlider).value = this.n2;
    (document.getElementById('theta') as EncSlider).value = this.theta;
    registerStateParam('n1', () => this.n1);
    registerStateParam('n2', () => this.n2);
    registerStateParam('theta', () => this.theta);
    for (const id of ['n1', 'n2', 'theta']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'n1') this.n1 = v;
        else if (id === 'n2') this.n2 = v;
        else this.theta = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.n1 = 1.00; this.n2 = 1.50; this.theta = 56;
      (document.getElementById('n1') as EncSlider).value = 1.00;
      (document.getElementById('n2') as EncSlider).value = 1.50;
      (document.getElementById('theta') as EncSlider).value = 56;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const pad = 48;
    const plotX = pad + 6, plotY = pad - 14, plotW = w - pad * 2, plotH = h - pad * 2.3;
    const xOf = (deg: number) => plotX + (deg / 90) * plotW;
    const yOf = (R: number) => plotY + (1 - R) * plotH;

    // Axes.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH); ctx.stroke();
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 0.5;
    for (let d = 15; d < 90; d += 15) { ctx.beginPath(); ctx.moveTo(xOf(d), plotY); ctx.lineTo(xOf(d), plotY + plotH); ctx.stroke(); }

    const thetaB = Math.atan2(this.n2, this.n1) * RAD;

    // Rs and Rp curves.
    const drawCurve = (which: 'Rs' | 'Rp', col: string) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const deg = (90 * i) / 360;
        const f = fresnel(this.n1, this.n2, deg * DEG);
        const px = xOf(deg), py = yOf(f[which]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    drawCurve('Rs', theme.slate);
    drawCurve('Rp', theme.crimson);

    // Brewster vertical.
    ctx.strokeStyle = theme.goldAlpha(0.8); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(xOf(thetaB), plotY); ctx.lineTo(xOf(thetaB), plotY + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Current angle marker.
    const f = fresnel(this.n1, this.n2, this.theta * DEG);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(this.theta), plotY); ctx.lineTo(xOf(this.theta), plotY + plotH); ctx.stroke();
    ctx.fillStyle = theme.slate; ctx.beginPath(); ctx.arc(xOf(this.theta), yOf(f.Rs), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = theme.crimson; ctx.beginPath(); ctx.arc(xOf(this.theta), yOf(f.Rp), 4, 0, 2 * Math.PI); ctx.fill();

    // Labels.
    ctx.fillStyle = axisStyle.label; ctx.font = '10px Inter, sans-serif';
    for (let d = 0; d <= 90; d += 30) ctx.fillText(`${d}°`, xOf(d) - 8, plotY + plotH + 14);
    for (let p = 0; p <= 1; p += 0.25) ctx.fillText(p.toFixed(2), plotX - 30, yOf(p) + 3);
    ctx.fillStyle = theme.slate; ctx.font = '500 12px Inter, sans-serif'; ctx.fillText('R_s', plotX + plotW - 70, plotY + 14);
    ctx.fillStyle = theme.crimson; ctx.fillText('R_p', plotX + plotW - 36, plotY + 14);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`θ_B`, xOf(thetaB) - 8, plotY - 2);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`θ_B = arctan(n₂/n₁) = ${thetaB.toFixed(2)}°`, plotX + 4, plotY + 14);
    ctx.fillText(`θ = ${this.theta}°   R_s = ${(f.Rs * 100).toFixed(1)}%   R_p = ${(f.Rp * 100).toFixed(1)}%`, plotX + 4, plotY + 32);
    if (Math.abs(this.theta - thetaB) < 0.8) {
      ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText('at Brewster angle — reflection is pure s-polarized', plotX + 4, plotY + 50);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => new Brewster());
