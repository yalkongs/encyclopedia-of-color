import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function chlConc(d: number): number { return Math.exp(-d / 15); }
function caroConc(_d: number): number { return 0.8; }
function anthoConc(d: number): number { return 1 / (1 + Math.exp(-(d - 25) / 6)) * 0.9; }

class Autumn {
  private stage: CanvasStage;
  private day = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.day = hydrateNumber('day', 30);
    const s = document.getElementById('day') as EncSlider; s.value = this.day;
    s.addEventListener('input', (e) => { this.day = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('day', () => Math.round(this.day));
    document.addEventListener('reset-params', () => { this.day = 30; s.value = 30; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const c = chlConc(this.day);
    const k = caroConc(this.day);
    const a = anthoConc(this.day);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`day ${this.day} · chl ${c.toFixed(2)} · caro ${k.toFixed(2)} · antho ${a.toFixed(2)}`, M, M);

    // Leaf swatch — colour blend
    // chl=green, caro=yellow, antho=red. weighted addition with chl dominating when present
    const total = c + k + a + 0.01;
    const rL = (c * 80 + k * 230 + a * 200) / total;
    const gL = (c * 150 + k * 200 + a * 50) / total;
    const bL = (c * 60 + k * 30 + a * 30) / total;

    g.fillStyle = `rgb(${Math.round(rL)},${Math.round(gL)},${Math.round(bL)})`;
    g.beginPath();
    g.moveTo(M + 100, M + 60);
    g.bezierCurveTo(M + 50, M + 120, M + 50, M + 280, M + 200, M + 320);
    g.bezierCurveTo(M + 350, M + 280, M + 350, M + 120, M + 200, M + 60);
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 2; g.stroke();
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('leaf', M + 200, M + 340);

    // Time-evolution plot
    const px = M + 420, py = M + 50, pw = w - px - M, ph = 250;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('pigment concentrations over autumn (days)', px + pw / 2, py - 6);
    const X = (d: number) => px + (d / 60) * pw;
    const Y = (v: number) => py + (1 - v) * ph;
    const fns: [string, (d: number) => number][] = [['#1f7a4d', chlConc], ['#d4a020', caroConc], ['#a3132d', anthoConc]];
    for (const [col, fn] of fns) {
      g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath();
      for (let d = 0; d <= 60; d += 1) { const X0 = X(d), Y0 = Y(fn(d)); if (d === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0); }
      g.stroke();
    }
    g.fillStyle = '#1a1a1a';
    for (const fn of [chlConc, caroConc, anthoConc]) { g.beginPath(); g.arc(X(this.day), Y(fn(this.day)), 4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#1f7a4d'; g.fillRect(px + 10, py + 10, 14, 4); g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left'; g.fillText('chlorophyll (decay)', px + 30, py + 14);
    g.fillStyle = '#d4a020'; g.fillRect(px + 10, py + 26, 14, 4); g.fillStyle = theme.ink; g.fillText('carotenoid (constant)', px + 30, py + 30);
    g.fillStyle = '#a3132d'; g.fillRect(px + 10, py + 42, 14, 4); g.fillStyle = theme.ink; g.fillText('anthocyanin (synth)', px + 30, py + 46);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Maples, sumacs, sweet-gum all *make* new anthocyanin in autumn — it costs energy, suggesting evolutionary purpose (signalling, photoprotection, anti-aphid).', M, h - M);
  }
}

new Autumn();
