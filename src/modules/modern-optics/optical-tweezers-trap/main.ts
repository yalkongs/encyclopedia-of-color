import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const TRAP_STIFF_pN_um = 0.4; // typical biological tweezer stiffness

class Tweezers {
  private stage: CanvasStage;
  private x = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.x = hydrateNumber('x', 1);
    const s = document.getElementById('x') as EncSlider; s.value = this.x;
    s.addEventListener('input', (e) => { this.x = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('x', () => this.x.toFixed(2));
    document.addEventListener('reset-params', () => { this.x = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Force: linear restoring -k*x (saturates beyond trap)
    const xClamp = Math.max(-2, Math.min(2, this.x));
    const force = -TRAP_STIFF_pN_um * xClamp;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`x = ${this.x.toFixed(2)} μm · trap stiffness k = ${TRAP_STIFF_pN_um} pN/μm · restoring force F = ${force.toFixed(3)} pN`, M, M);

    // Setup: focused laser cone + bead
    const cx = w / 2 - 50, cy = h / 2 - 20;
    // Lens
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 100, cy - 100); g.lineTo(cx - 100, cy + 100); g.stroke();
    g.beginPath(); g.moveTo(cx - 105, cy - 92); g.lineTo(cx - 100, cy - 100); g.lineTo(cx - 95, cy - 92); g.stroke();
    g.beginPath(); g.moveTo(cx - 105, cy + 92); g.lineTo(cx - 100, cy + 100); g.lineTo(cx - 95, cy + 92); g.stroke();
    // Beam converging then diverging
    g.fillStyle = 'rgba(80,180,255,0.35)';
    g.beginPath();
    g.moveTo(cx - 100, cy - 80); g.lineTo(cx, cy); g.lineTo(cx - 100, cy + 80); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(cx + 200, cy - 80); g.lineTo(cx, cy); g.lineTo(cx + 200, cy + 80); g.closePath(); g.fill();
    // Focus point
    g.fillStyle = '#3a76a8'; g.beginPath(); g.arc(cx, cy, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('focus', cx, cy + 16);

    // Particle: position cx + x*30
    const px = cx + this.x * 30;
    g.fillStyle = 'rgba(255,200,150,0.7)';
    g.beginPath(); g.arc(px, cy, 14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = theme.ink; g.font = 'bold 11px serif';
    g.fillText('bead', px, cy - 22);

    // Force arrow on bead
    if (Math.abs(force) > 0.01) {
      const arrowLen = -force * 40; // pull toward focus
      g.strokeStyle = theme.crimson; g.lineWidth = 3;
      g.beginPath(); g.moveTo(px, cy + 30); g.lineTo(px + arrowLen, cy + 30);
      g.lineTo(px + arrowLen - Math.sign(arrowLen) * 6, cy + 26);
      g.moveTo(px + arrowLen, cy + 30);
      g.lineTo(px + arrowLen - Math.sign(arrowLen) * 6, cy + 34); g.stroke();
      g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(`F = ${force.toFixed(2)} pN`, px + arrowLen / 2, cy + 48);
    }

    // F(x) curve (right)
    const fx0 = cx + 200, fy0 = M + 40, fw0 = w - fx0 - M, fh0 = 200;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(fx0, fy0, fw0, fh0);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('restoring force F(x)', fx0 + fw0 / 2, fy0 - 4);
    const X = (xx: number) => fx0 + ((xx + 3) / 6) * fw0;
    const Y = (ff: number) => fy0 + fh0 / 2 - (ff / 1.5) * (fh0 / 2);
    // Axis
    g.strokeStyle = theme.inkAlpha(0.4); g.beginPath();
    g.moveTo(fx0, fy0 + fh0 / 2); g.lineTo(fx0 + fw0, fy0 + fh0 / 2); g.stroke();
    g.beginPath(); g.moveTo(X(0), fy0); g.lineTo(X(0), fy0 + fh0); g.stroke();
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let xx = -3; xx <= 3; xx += 0.05) {
      const xc = Math.max(-2, Math.min(2, xx));
      const ff = -TRAP_STIFF_pN_um * xc;
      const X0 = X(xx), Y0 = Y(ff);
      if (xx === -3) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.x), Y(force), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
    g.textAlign = 'left'; g.fillText('−3 μm', fx0, fy0 + fh0 + 14);
    g.textAlign = 'right'; g.fillText('+3 μm', fx0 + fw0, fy0 + fh0 + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Typical trap: 1064 nm laser, ~100 mW, k = 0.1-1 pN/μm. Enough to stall a kinesin motor (~7 pN) or unfold DNA.', M, h - M);
  }
}

new Tweezers();
