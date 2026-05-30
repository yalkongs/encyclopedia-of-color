import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TG_PET = 80; // glass transition (°C)
const T_OPTIMAL = 130;

function uptake(T: number): number {
  // Sigmoid around Tg, fully saturating by 140 °C
  return 1 / (1 + Math.exp(-(T - (TG_PET + 20)) / 8));
}

class DisperseDye {
  private stage: CanvasStage;
  private T = 80;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.T = hydrateNumber('T', 80);
    const s = document.getElementById('T') as EncSlider; s.value = this.T;
    s.addEventListener('input', (e) => { this.T = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('T', () => Math.round(this.T));
    document.addEventListener('reset-params', () => { this.T = 80; s.value = 80; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const u = uptake(this.T);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`T = ${this.T} °C · uptake θ = ${u.toFixed(3)}  ${this.T < TG_PET ? '(below PET Tg — no penetration)' : this.T < 110 ? '(soft polymer — partial uptake)' : '(commercial range — full saturation)'}`, M, M);

    // Cross-section of a polyester fibre
    const fX = M + 40, fY = M + 50, fW = 280, fH = 240;
    // Outer fibre
    g.fillStyle = '#fefcf6'; g.fillRect(fX, fY, fW, fH);
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2; g.strokeRect(fX, fY, fW, fH);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('polyester fibre cross-section', fX + fW / 2, fY + fH + 16);

    // Surface particles (top edge): dense in cold case
    const surfaceDensity = 1 - u;
    for (let i = 0; i < 60; i++) {
      const x = fX + 10 + Math.random() * (fW - 20);
      const y = fY - 4 - Math.random() * 4;
      g.fillStyle = `rgba(200,30,60,${0.5 + 0.4 * Math.random()})`;
      g.beginPath(); g.arc(x, y, 2 + Math.random() * 2, 0, Math.PI * 2); g.fill();
      void surfaceDensity;
    }
    // Particles inside the fibre — depth depends on T (scaled by u)
    const penetration = u * fH * 0.95;
    const nIn = Math.floor(80 * u);
    for (let i = 0; i < nIn; i++) {
      const x = fX + 10 + Math.random() * (fW - 20);
      const y = fY + 5 + Math.random() * penetration;
      g.fillStyle = `rgba(200,30,60,${0.4 + 0.3 * Math.random()})`;
      g.beginPath(); g.arc(x, y, 2 + Math.random() * 1.5, 0, Math.PI * 2); g.fill();
    }
    // Penetration depth bar
    g.strokeStyle = theme.crimson; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(fX, fY + penetration); g.lineTo(fX + fW, fY + penetration); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.crimson; g.font = '10px serif'; g.textAlign = 'left';
    g.fillText(`penetration depth ≈ ${(u * 100).toFixed(0)}% of fibre`, fX + 6, fY + penetration - 4);

    // Right: temperature plot
    const px = fX + fW + 50, py = fY, pw = w - px - M, ph = fH;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('uptake vs temperature', px + pw / 2, py - 6);
    g.fillText('T (°C) →', px + pw / 2, py + ph + 16);

    // Curve
    const X = (T: number) => px + ((T - 40) / 120) * pw;
    const Y = (u2: number) => py + (1 - u2) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let T = 40; T <= 160; T += 1) {
      const X0 = X(T), Y0 = Y(uptake(T));
      if (T === 40) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    // Tg + optimal markers
    g.strokeStyle = theme.gold; g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(TG_PET), py); g.lineTo(X(TG_PET), py + ph); g.stroke();
    g.beginPath(); g.moveTo(X(T_OPTIMAL), py); g.lineTo(X(T_OPTIMAL), py + ph); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.gold; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('Tg', X(TG_PET), py - 4);
    g.fillText('130 °C', X(T_OPTIMAL), py - 4);
    g.fillStyle = theme.ink;
    g.beginPath(); g.arc(X(this.T), Y(u), 5, 0, Math.PI * 2); g.fill();

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Commercial polyester dyeing is done at 130 °C / 2 bar in pressure dyeing vessels — the only practical route to deep, even shades.', M, h - M);
  }
}

new DisperseDye();
