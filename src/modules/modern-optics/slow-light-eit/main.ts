import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class EIT {
  private stage: CanvasStage;
  private p = 0.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.p = hydrateNumber('p', 0.5);
    const s = document.getElementById('p') as EncSlider; s.value = this.p;
    s.addEventListener('input', (e) => { this.p = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('p', () => this.p.toFixed(2));
    document.addEventListener('reset-params', () => { this.p = 0.5; s.value = 0.5; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Coupling-laser strength sets transparency window width Ω
    const omega = 0.05 + 0.5 * this.p;
    // Group velocity (m/s): scales inversely with dn/dω — narrower window gives slower light
    const vg = this.p < 0.01 ? 0 : Math.max(10, 3e8 * (omega / 5));

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`coupling Ω/γ = ${omega.toFixed(2)} · group velocity v_g ≈ ${vg < 1e5 ? vg.toFixed(0) + ' m/s' : (vg / 1e8).toFixed(3) + ' × 10⁸ m/s'} · slowdown ≈ ${(3e8 / vg).toExponential(1)}×`, M, M);

    // Two-panel: absorption + dispersion vs detuning
    const px = M, py = M + 50, pw = w - 2 * M, ph = (h - 2 * M - 90) / 2;
    // Panel 1: absorption
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('absorption α(δ)', px + pw / 2, py - 4);
    g.strokeStyle = '#c2382c'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const delta = -5 + (i / 200) * 10;
      // Absorption: Lorentzian minus EIT dip at δ = 0
      const baseLor = 1 / (1 + delta * delta);
      const eitDip = (omega * omega) / (omega * omega + delta * delta);
      const alpha = baseLor * (1 - eitDip);
      const x = px + (i / 200) * pw, y = py + (1 - alpha) * ph;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    // Highlight EIT window
    g.fillStyle = `rgba(60,150,80,${0.15 + 0.2 * this.p})`;
    g.fillRect(px + pw / 2 - omega * pw / 10, py, omega * pw / 5, ph);

    // Panel 2: dispersion
    const py2 = py + ph + 40;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py2, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('refractive index n(δ) − 1 (steep slope inside EIT window → slow group velocity)', px + pw / 2, py2 - 4);
    g.strokeStyle = '#3a76a8'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const delta = -5 + (i / 200) * 10;
      // n - 1: Kramers-Kronig partner; without EIT it's antisymmetric Lorentzian.
      // With EIT, very steep linear slope through δ = 0.
      let n;
      if (Math.abs(delta) < omega) {
        n = -delta / omega * 0.5; // steep linear
      } else {
        n = -Math.sign(delta) * 0.5 - (delta - Math.sign(delta) * omega) * 0.02;
      }
      const x = px + (i / 200) * pw;
      const y = py2 + ph / 2 - n * ph / 2;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = theme.inkAlpha(0.3); g.beginPath();
    g.moveTo(px, py2 + ph / 2); g.lineTo(px + pw, py2 + ph / 2); g.stroke();
    g.fillStyle = `rgba(60,150,80,${0.15 + 0.2 * this.p})`;
    g.fillRect(px + pw / 2 - omega * pw / 10, py2, omega * pw / 5, ph);

    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('−5γ', px, py2 + ph + 14);
    g.textAlign = 'right'; g.fillText('+5γ', px + pw, py2 + ph + 14);
    g.textAlign = 'center'; g.fillText('detuning δ from line centre', px + pw / 2, py2 + ph + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Hau, Harris, Dutton, Behroozi 1999: light pulse propagating at 17 m/s through ultracold Na — slower than a sprinter.', M, h - M);
  }
}

new EIT();
