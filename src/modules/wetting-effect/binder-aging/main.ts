import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type Env = 'dark' | 'uv-exposed';
const ENVS: Env[] = ['dark', 'uv-exposed'];

function carbonylConc(years: number, env: Env): number {
  // first-order: [C=O] = A_max (1 - e^(-k*t))
  const k = env === 'uv-exposed' ? 0.06 : 0.012;
  return 1 - Math.exp(-k * years);
}

class BinderAging {
  private stage: CanvasStage;
  private yrs = 50;
  private env: Env = 'dark';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.yrs = hydrateNumber('yrs', 50);
    const raw = hydrateFromUrl('env');
    if (raw && (ENVS as string[]).includes(raw)) this.env = raw as Env;
    const sY = document.getElementById('yrs') as EncSlider; sY.value = this.yrs;
    sY.addEventListener('input', (e) => { this.yrs = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tE = document.getElementById('env') as EncToggle; tE.value = this.env;
    tE.addEventListener('change', (e) => { this.env = (e as CustomEvent).detail.value as Env; this.draw(); notifyStateChange(); });
    registerStateParam('yrs', () => Math.round(this.yrs));
    registerStateParam('env', () => this.env);
    document.addEventListener('reset-params', () => { this.yrs = 50; this.env = 'dark'; sY.value = 50; tE.value = 'dark'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const c = carbonylConc(this.yrs, this.env);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`years = ${this.yrs} · environment = ${this.env} · carbonyl conc. = ${c.toFixed(3)} (saturating)`, M, M);

    // Swatch — once-white film that yellows
    const sX = M + 30, sY = M + 50, sW = 280, sH = 200;
    const tint = c * 0.5;
    const r = 245, gn = Math.round(245 - tint * 60), b = Math.round(240 - tint * 110);
    g.fillStyle = `rgb(${r},${gn},${b})`;
    g.fillRect(sX, sY, sW, sH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sX, sY, sW, sH);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('once-white linseed-oil film', sX + sW / 2, sY + sH + 16);

    // Absorption tail plot
    const px = sX + sW + 50, py = sY, pw = w - px - M, ph = sH;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('absorbance vs wavelength (n→π* tail)', px + pw / 2, py - 6);
    g.fillText('λ (nm)', px + pw / 2, py + ph + 16);

    // Curve: Gaussian centred 350nm with tail into visible
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let lam = 320; lam <= 700; lam += 2) {
      const A = c * Math.exp(-Math.pow((lam - 350) / 60, 2));
      const X = px + ((lam - 320) / 380) * pw;
      const Y = py + ph - A * ph * 0.85;
      if (lam === 320) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();
    // Visible band overlay
    for (let lam = 380; lam <= 700; lam += 4) {
      const X = px + ((lam - 320) / 380) * pw;
      g.fillStyle = `hsla(${260 - (lam - 380)},80%,55%,0.12)`;
      g.fillRect(X, py + ph - 8, ((lam + 4 - 320) / 380) * pw - ((lam - 320) / 380) * pw + 1, 8);
    }

    // Year axis
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    for (const lam of [350, 400, 500, 600, 700]) {
      const X = px + ((lam - 320) / 380) * pw;
      g.fillText(`${lam}`, X, py + ph + 30);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Restorers reverse the yellowing by re-bleaching with mild peroxide or by varnish replacement — but the cross-linked film cannot be returned to original.', M, h - M);
  }
}

new BinderAging();
