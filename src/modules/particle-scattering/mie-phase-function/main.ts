import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { sizeParameter, asymmetryG, henyeyGreenstein } from '@core/math/scattering';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class MiePhase {
  private stage: CanvasStage;
  private logr = 2.0;
  private lambda = 550;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.logr = hydrateNumber('logr', 2.0);
    this.lambda = hydrateNumber('lambda', 550);
    (document.getElementById('logr') as EncSlider).value = this.logr;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    registerStateParam('logr', () => this.logr);
    registerStateParam('lambda', () => this.lambda);
    for (const id of ['logr', 'lambda']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'logr') this.logr = v; else this.lambda = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.logr = 2.0; this.lambda = 550;
      (document.getElementById('logr') as EncSlider).value = 2.0;
      (document.getElementById('lambda') as EncSlider).value = 550;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const r = Math.pow(10, this.logr);
    const x = sizeParameter(r, this.lambda);
    const g = asymmetryG(x);

    const cx = w * 0.5, cy = h * 0.52;
    const R = Math.min(w, h) * 0.36;

    // Reference rings + axes.
    ctx.strokeStyle = theme.inkAlpha(0.12); ctx.lineWidth = 1;
    for (let f = 0.25; f <= 1; f += 0.25) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.strokeStyle = theme.inkAlpha(0.25);
    ctx.beginPath(); ctx.moveTo(cx - R * 1.1, cy); ctx.lineTo(cx + R * 1.15, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.1); ctx.lineTo(cx, cy + R * 1.1); ctx.stroke();

    // Incident beam from the left → forward is +x (to the right).
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - R * 1.35, cy); ctx.lineTo(cx - R * 1.12, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R * 1.12, cy); ctx.lineTo(cx - R * 1.2, cy - 5); ctx.moveTo(cx - R * 1.12, cy); ctx.lineTo(cx - R * 1.2, cy + 5); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('incident', cx - R * 1.35, cy - 10);
    ctx.fillText('forward →', cx + R * 0.7, cy - 10);
    ctx.fillText('← back', cx - R * 1.05, cy + 18);

    // Rayleigh dipole pattern p ∝ 1 + cos²θ (θ from forward).
    const rayleigh = (th: number) => (1 + Math.cos(th) ** 2);
    let rayMax = 2;
    ctx.strokeStyle = theme.slateAlpha(0.7); ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const th = (2 * Math.PI * i) / 360;
      const rr = (rayleigh(th) / rayMax) * R * 0.7;
      const px = cx + Math.cos(th) * rr, py = cy - Math.sin(th) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();

    // Size-dependent HG pattern (crimson), log-compressed for visibility.
    const hgVal = (th: number) => henyeyGreenstein(Math.cos(th), g);
    let hgMax = 0;
    for (let i = 0; i <= 360; i++) { const th = (2 * Math.PI * i) / 360; hgMax = Math.max(hgMax, hgVal(th)); }
    const compress = (v: number) => Math.pow(v / hgMax, 0.35); // gamma so back lobe stays visible
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const th = (2 * Math.PI * i) / 360;
      const rr = compress(hgVal(th)) * R;
      const px = cx + Math.cos(th) * rr, py = cy - Math.sin(th) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();

    // Legend.
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillStyle = theme.slate; ctx.fillText('— Rayleigh dipole', 16, h - 36);
    ctx.fillStyle = theme.crimson; ctx.fillText('— size-dependent (HG)', 16, h - 18);

    // Readouts.
    const rNm = r >= 1000 ? `${(r / 1000).toFixed(2)} µm` : `${r.toFixed(1)} nm`;
    let regime = g < 0.05 ? 'near-symmetric (Rayleigh-like)' : g > 0.6 ? 'strongly forward (large particle)' : 'forward-tilted';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`r = ${rNm}   x = ${x.toFixed(2)}   asymmetry g = ${g.toFixed(3)}`, 16, 30);
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(regime, 16, 50);
  }
}
window.addEventListener('DOMContentLoaded', () => new MiePhase());
