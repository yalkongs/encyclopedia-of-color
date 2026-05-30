import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

function lsprLambda(sizeNm: number): number {
  // Empirical: small ~520, grows ~+0.5 nm per nm of diameter, broadens above 80 nm
  return 510 + (sizeNm - 10) * 0.7;
}

function complementCss(lam: number): string {
  if (lam < 380) return '#fff';
  const offsetTable: [number, number][] = [
    [400, 580], [430, 600], [450, 580], [490, 620], [520, 640], [550, 680], [580, 450], [610, 480], [640, 490], [700, 510],
  ];
  for (let i = 0; i < offsetTable.length - 1; i++) {
    const [l0, c0] = offsetTable[i], [l1, c1] = offsetTable[i + 1];
    if (lam >= l0 && lam <= l1) {
      const t = (lam - l0) / (l1 - l0);
      return wavelengthCss(c0 + t * (c1 - c0));
    }
  }
  return wavelengthCss(660);
}

class GoldPlasmon {
  private stage: CanvasStage;
  private size = 20;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.size = hydrateNumber('size', 20);
    const s = document.getElementById('size') as EncSlider; s.value = this.size;
    s.addEventListener('input', (e) => { this.size = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('size', () => Math.round(this.size));
    document.addEventListener('reset-params', () => { this.size = 20; s.value = 20; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const lam = lsprLambda(this.size);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Au sphere ${this.size} nm · LSPR λ ≈ ${lam.toFixed(0)} nm · solution colour: complement`, M, M);

    // Particle illustration (sphere proportional)
    const cx = M + 130, cy = M + 180, rPx = Math.min(80, this.size * 0.8);
    const grad = g.createRadialGradient(cx - rPx * 0.3, cy - rPx * 0.3, 0, cx, cy, rPx);
    grad.addColorStop(0, '#fff5b0'); grad.addColorStop(1, '#d4a020');
    g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, rPx, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('gold nanoparticle (drawn to scale)', cx, cy + rPx + 16);

    // Solution swatch
    const sx = cx + 150, sy = M + 60, sw = 260, sh = 240;
    g.fillStyle = complementCss(lam);
    g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('colloidal solution colour', sx + sw / 2, sy + sh + 16);

    // Spectrum strip
    const by = sy + sh + 50, bx = M, bw = w - 2 * M, bh = 50;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('LSPR absorption band on the visible spectrum', bx, by - 4);
    for (let p = 0; p < bw; p++) {
      const l = 380 + (p / bw) * 400;
      g.fillStyle = wavelengthCss(l);
      g.fillRect(bx + p, by, 1, bh);
    }
    const sigma = 50 + (this.size - 20) * 0.6;
    for (let p = 0; p < bw; p++) {
      const l = 380 + (p / bw) * 400;
      const a = Math.exp(-Math.pow((l - lam) / sigma, 2));
      if (a > 0.02) { g.fillStyle = `rgba(0,0,0,${a * 0.85})`; g.fillRect(bx + p, by, 1, bh); }
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, bw, bh);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Bulk gold reflects yellow; nano-gold absorbs green. Same atoms, different physics — Faraday\'s 1857 gold sols are the founding LSPR experiments.', M, h - M);
  }
}

new GoldPlasmon();
