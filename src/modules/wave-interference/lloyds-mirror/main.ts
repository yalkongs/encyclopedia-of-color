import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function lambdaToColor(lam: number): string {
  let r = 0, g = 0, b = 0;
  if (lam < 440)      { r = -(lam - 440) / (440 - 380); b = 1; }
  else if (lam < 490) { g = (lam - 440) / (490 - 440); b = 1; }
  else if (lam < 510) { g = 1; b = -(lam - 510) / (510 - 490); }
  else if (lam < 580) { r = (lam - 510) / (580 - 510); g = 1; }
  else if (lam < 645) { r = 1; g = -(lam - 645) / (645 - 580); }
  else                { r = 1; }
  let s = 1;
  if (lam < 420)      s = 0.3 + 0.7 * (lam - 380) / 40;
  else if (lam > 700) s = 0.3 + 0.7 * (780 - lam) / 80;
  const to8 = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v * s)));
  return `rgb(${to8(r)},${to8(g)},${to8(b)})`;
}

class LloydsMirror {
  private stage: CanvasStage;
  private h = 60;        // µm
  private lambda = 540;  // nm
  private L = 120;       // cm

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.h = hydrateNumber('h', 60);
    this.lambda = hydrateNumber('lambda', 540);
    this.L = hydrateNumber('L', 120);
    (document.getElementById('h') as EncSlider).value = this.h;
    (document.getElementById('lambda') as EncSlider).value = this.lambda;
    (document.getElementById('L') as EncSlider).value = this.L;
    registerStateParam('h', () => this.h);
    registerStateParam('lambda', () => this.lambda);
    registerStateParam('L', () => this.L);
    for (const id of ['h', 'lambda', 'L']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'h') this.h = v;
        else if (id === 'lambda') this.lambda = v;
        else this.L = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.h = 60; this.lambda = 540; this.L = 120;
      (document.getElementById('h') as EncSlider).value = 60;
      (document.getElementById('lambda') as EncSlider).value = 540;
      (document.getElementById('L') as EncSlider).value = 120;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const color = lambdaToColor(this.lambda);
    const mirrorY = h * 0.66;          // mirror plane (horizontal)
    const srcX = w * 0.14;
    const screenX = w * 0.82;
    const hPx = Math.min(h * 0.22, 16 + this.h * 0.5);
    const S = { x: srcX, y: mirrorY - hPx };
    const Sv = { x: srcX, y: mirrorY + hPx };   // virtual image below mirror

    // Mirror.
    ctx.strokeStyle = theme.inkAlpha(0.7); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(srcX, mirrorY); ctx.lineTo(screenX, mirrorY); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('mirror', (srcX + screenX) / 2 - 16, mirrorY + 16);

    // Direct & reflected rays toward a few screen points above mirror.
    ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      const ty = mirrorY - (k / 4) * (mirrorY - h * 0.12);
      // Direct ray S → screen point.
      ctx.strokeStyle = theme.slateAlpha(0.35);
      ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(screenX, ty); ctx.stroke();
      // Reflected ray: from S to mirror bounce point to screen — equivalently Sv → screen.
      // Find bounce point where line Sv→(screenX,ty) crosses mirrorY.
      const t = (mirrorY - Sv.y) / (ty - Sv.y);
      const bx = Sv.x + t * (screenX - Sv.x);
      ctx.strokeStyle = theme.crimsonAlpha(0.32);
      ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(bx, mirrorY); ctx.lineTo(screenX, ty); ctx.stroke();
    }

    // Source markers.
    ctx.fillStyle = theme.ink;
    ctx.beginPath(); ctx.arc(S.x, S.y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('S', S.x - 14, S.y - 6);
    ctx.fillStyle = theme.inkAlpha(0.45);
    ctx.beginPath(); ctx.arc(Sv.x, Sv.y, 3.5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(Sv.x, Sv.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText("S′ (image)", Sv.x + 8, Sv.y + 4);

    // Screen line.
    ctx.strokeStyle = theme.inkAlpha(0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(screenX, h * 0.10); ctx.lineTo(screenX, mirrorY); ctx.stroke();

    // Fringe profile (only above mirror, y measured up from mirror).
    const dM = 2 * this.h * 1e-6;     // effective source separation (m)
    const lamM = this.lambda * 1e-9;
    const Lm = this.L * 1e-2;
    const fringeM = (lamM * Lm) / dM;  // Δy (m)
    const topY = h * 0.10;
    const spanPx = mirrorY - topY;
    const yScaleMperPx = (fringeM * 4) / spanPx; // show ~4 fringes
    const profileW = w * 0.12;

    ctx.strokeStyle = color; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let py = 0; py <= spanPx; py += 1) {
      const yM = py * yScaleMperPx;   // height above mirror in metres
      const phase = (Math.PI * dM * yM) / (lamM * Lm);
      const I = Math.sin(phase) ** 2;   // sin² → dark at mirror edge
      const px = screenX + 6 + I * profileW;
      const sy = mirrorY - py;
      if (py === 0) ctx.moveTo(px, sy); else ctx.lineTo(px, sy);
    }
    ctx.stroke();

    // Dark edge marker at mirror.
    ctx.fillStyle = theme.crimson;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('← dark edge fringe', screenX + 10, mirrorY - 2);

    // Readouts.
    ctx.fillStyle = theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`h = ${this.h} µm   2h = ${(2 * this.h)} µm   λ = ${this.lambda} nm   L = ${this.L} cm`, 14, 26);
    ctx.fillText(`Δy = λL/2h = ${(fringeM * 1000).toFixed(2)} mm`, 14, 48);
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('screen I(y)', screenX + 8, h * 0.09);
  }
}
window.addEventListener('DOMContentLoaded', () => new LloydsMirror());
