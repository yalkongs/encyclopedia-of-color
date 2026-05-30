import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

class Upconversion {
  private stage: CanvasStage;
  private P = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.P = hydrateNumber('P', 10);
    const s = document.getElementById('P') as EncSlider; s.value = this.P;
    s.addEventListener('input', (e) => { this.P = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('P', () => Math.round(this.P));
    document.addEventListener('reset-params', () => { this.P = 10; s.value = 10; this.draw(); notifyStateChange(); });
  }

  // Green output ∝ P², red output ∝ P^2 with different coefficient
  private outputs(P: number): { green: number; red: number } {
    return { green: 0.002 * P * P, red: 0.0008 * P * P };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const out = this.outputs(this.P);
    const totalOut = out.green + out.red;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pump = ${this.P} mW · output ∝ P² · green ${out.green.toFixed(3)} mW · red ${out.red.toFixed(3)} mW`, M, M);

    // Energy diagram (left)
    const dx = M + 30, dy = M + 50, dw = 280, dh = 220;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(dx, dy, dw, dh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Yb³⁺ / Er³⁺ energy ladder', dx + dw / 2, dy - 6);
    // Levels
    const levels = [
      { y: dy + dh - 30, label: 'ground' },
      { y: dy + dh * 0.65, label: 'Yb ²F_{5/2} = 980 nm' },
      { y: dy + dh * 0.50, label: 'Er ⁴I_{11/2}' },
      { y: dy + dh * 0.25, label: 'Er ⁴F_{7/2}' },
      { y: dy + dh * 0.18, label: 'Er ²H_{11/2}' },
    ];
    for (const lv of levels) {
      g.strokeStyle = theme.ink; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(dx + 30, lv.y); g.lineTo(dx + 250, lv.y); g.stroke();
      g.fillStyle = theme.inkAlpha(0.75); g.font = '10px serif'; g.textAlign = 'left';
      g.fillText(lv.label, dx + 254, lv.y + 3);
    }
    // IR pump arrows (two)
    g.strokeStyle = '#a3132d'; g.lineWidth = 1.5;
    for (const ax of [dx + 60, dx + 80]) {
      g.beginPath();
      g.moveTo(ax, dy + dh - 30); g.lineTo(ax, dy + dh * 0.65);
      g.lineTo(ax - 3, dy + dh * 0.65 + 4); g.moveTo(ax, dy + dh * 0.65); g.lineTo(ax + 3, dy + dh * 0.65 + 4);
      g.stroke();
    }
    g.fillStyle = '#a3132d'; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('IR×2', dx + 70, dy + dh - 6);
    // Visible emission arrow
    g.strokeStyle = '#1f7a4d'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(dx + 200, dy + dh * 0.18); g.lineTo(dx + 200, dy + dh - 30);
    g.lineTo(dx + 196, dy + dh - 36); g.moveTo(dx + 200, dy + dh - 30); g.lineTo(dx + 204, dy + dh - 36);
    g.stroke();
    g.fillStyle = '#1f7a4d'; g.font = '10px serif';
    g.fillText('540 nm', dx + 220, dy + dh / 2);

    // Output swatch (mix of green + red weighted)
    const sx = dx + dw + 30, sy = dy, sw = 200, sh = dh / 2 - 20;
    const dispGreen = Math.min(1, out.green * 2);
    g.fillStyle = wavelengthCss(540);
    g.globalAlpha = dispGreen; g.fillRect(sx, sy, sw, sh); g.globalAlpha = 1;
    g.fillStyle = `rgba(20,20,20,${1 - dispGreen})`; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('green emission (540 nm)', sx + sw / 2, sy + sh + 14);

    const sy2 = sy + sh + 40;
    const dispRed = Math.min(1, out.red * 3);
    g.fillStyle = wavelengthCss(660);
    g.globalAlpha = dispRed; g.fillRect(sx, sy2, sw, sh); g.globalAlpha = 1;
    g.fillStyle = `rgba(20,20,20,${1 - dispRed})`; g.fillRect(sx, sy2, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy2, sw, sh);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('red emission (660 nm)', sx + sw / 2, sy2 + sh + 14);

    // Log-log plot
    const px = sx + sw + 30, py = sy, pw = w - px - M, ph = dh;
    if (pw > 100) {
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
      g.fillText('log output vs log pump (slope = 2)', px + pw / 2, py - 6);
      const X = (logP: number) => px + (logP / 2) * pw;
      const Y = (logI: number) => py + (1 - (logI + 4) / 6) * ph;
      g.strokeStyle = '#1f7a4d'; g.lineWidth = 2;
      g.beginPath();
      for (let lp = 0; lp <= 2; lp += 0.02) {
        const P = Math.pow(10, lp);
        const I = this.outputs(P).green;
        const X0 = X(lp), Y0 = Y(Math.log10(Math.max(1e-4, I)));
        if (lp === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
      }
      g.stroke();
      // marker
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.arc(X(Math.log10(this.P)), Y(Math.log10(out.green)), 4, 0, Math.PI * 2); g.fill();
      void totalOut;
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('UC nanoparticles (NaYF₄:Yb,Er) are research darlings: deep-tissue bio-imaging (NIR penetrates flesh), security inks, photodynamic therapy.', M, h - M);
  }
}

new Upconversion();
