import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const EA_KJ = 85;
const R_GAS = 8.314e-3; // kJ/(mol·K)
const PRE_FACTOR = 8e8; // per year

function thermalRate(T_C: number): number {
  const T = T_C + 273.15;
  return PRE_FACTOR * Math.exp(-EA_KJ / (R_GAS * T));
}
function photoRate(UV: number): number {
  return 0.02 * UV; // per year
}

class HeatVsLight {
  private stage: CanvasStage;
  private T = 25;
  private UV = 3;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.T = hydrateNumber('T', 25);
    this.UV = hydrateNumber('UV', 3);
    const sT = document.getElementById('T') as EncSlider; sT.value = this.T;
    sT.addEventListener('input', (e) => { this.T = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sU = document.getElementById('UV') as EncSlider; sU.value = this.UV;
    sU.addEventListener('input', (e) => { this.UV = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('T', () => Math.round(this.T));
    registerStateParam('UV', () => Math.round(this.UV));
    document.addEventListener('reset-params', () => { this.T = 25; this.UV = 3; sT.value = 25; sU.value = 3; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const rT = thermalRate(this.T);
    const rL = photoRate(this.UV);
    const rTot = rT + rL;
    const halfLife = Math.log(2) / Math.max(0.0001, rTot);
    const dominator = rT > rL ? 'thermal' : 'photo';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`T = ${this.T} °C · UV = ${this.UV}× · dominant mechanism: ${dominator}`, M, M);
    g.fillStyle = theme.crimson; g.font = '13px serif';
    g.fillText(`predicted half-life = ${halfLife.toFixed(1)} years`, M, M + 20);

    // Two rate bars
    const by = M + 60;
    const bw = w - 2 * M;
    const totalMax = Math.max(rTot, 0.5);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('thermal rate (Arrhenius)', M, by);
    g.fillStyle = theme.crimson; g.fillRect(M, by + 8, (rT / totalMax) * bw, 18);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, by + 8, bw, 18);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`${rT.toExponential(2)} yr⁻¹`, M + 4, by + 22);

    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('photo rate (UV-driven)', M, by + 50);
    g.fillStyle = '#1f567a'; g.fillRect(M, by + 58, (rL / totalMax) * bw, 18);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, by + 58, bw, 18);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
    g.fillText(`${rL.toExponential(2)} yr⁻¹`, M + 4, by + 72);

    // Arrhenius curve (rate vs T at current UV)
    const px = M, py = by + 110, pw = (w - 3 * M) / 2, ph = 160;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('rate vs T (log scale, current UV)', px + pw / 2, py - 6);
    g.fillText('T (°C) →', px + pw / 2, py + ph + 14);
    const Xt = (T: number) => px + ((T - 10) / 70) * pw;
    const Ylog = (r: number) => py + (1 - Math.min(1, Math.max(0, (Math.log10(Math.max(1e-4, r)) + 4) / 6))) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let T = 10; T <= 80; T += 1) {
      const X0 = Xt(T), Y0 = Ylog(thermalRate(T));
      if (T === 10) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.strokeStyle = '#1f567a'; g.lineWidth = 2;
    g.beginPath();
    for (let T = 10; T <= 80; T += 1) {
      const X0 = Xt(T), Y0 = Ylog(photoRate(this.UV));
      if (T === 10) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(Xt(this.T), Ylog(thermalRate(this.T)), 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(Xt(this.T), Ylog(photoRate(this.UV)), 4, 0, Math.PI * 2); g.fill();

    // Regime map (UV vs T)
    const rx = M * 2 + pw, ry = py, rw = pw, rh = ph;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(rx, ry, rw, rh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('dominant mechanism (UV × T grid)', rx + rw / 2, ry - 6);
    g.fillText('T →', rx + rw / 2, ry + rh + 14);
    g.save(); g.translate(rx - 12, ry + rh / 2); g.rotate(-Math.PI / 2);
    g.fillText('UV →', 0, 0); g.restore();
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 20; j++) {
        const TT = 10 + (i / 40) * 70;
        const UV = (j / 20) * 20;
        const r1 = thermalRate(TT), r2 = photoRate(UV);
        const dom = r1 > r2 ? theme.crimson : '#1f567a';
        g.fillStyle = dom + (dom.length === 7 ? '88' : '');
        g.fillRect(rx + (i / 40) * rw, ry + (1 - j / 20) * rh - rh / 20, rw / 40, rh / 20);
      }
    }
    // current marker
    g.strokeStyle = theme.gold; g.lineWidth = 2;
    g.beginPath(); g.arc(rx + ((this.T - 10) / 70) * rw, ry + (1 - this.UV / 20) * rh, 6, 0, Math.PI * 2); g.stroke();

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Conservation rule: low T + low light (museum vault) extends pigment life by orders of magnitude beyond home display conditions.', M, h - M);
  }
}

new HeatVsLight();
