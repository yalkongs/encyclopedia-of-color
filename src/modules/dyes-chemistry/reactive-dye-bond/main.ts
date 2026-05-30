import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ReactiveDye {
  private stage: CanvasStage;
  private washes = 10;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.washes = hydrateNumber('washes', 10);
    const s = document.getElementById('washes') as EncSlider; s.value = this.washes;
    s.addEventListener('input', (e) => { this.washes = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('washes', () => Math.round(this.washes));
    document.addEventListener('reset-params', () => { this.washes = 10; s.value = 10; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Direct dye: exponential decay (k=0.08 per wash)
    const directRetained = Math.exp(-0.08 * this.washes);
    // Reactive dye: minimal loss (k=0.005 per wash, asymptote at 90%)
    const reactiveRetained = 0.92 + (1 - 0.92) * Math.exp(-0.05 * this.washes);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`after ${this.washes} wash cycles — colour retention compared`, M, M);

    // Top schematic: direct vs reactive bonds
    const sy = M + 30;
    const x1 = M + 80, x2 = M + 380;
    // Direct
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'center';
    g.fillText('direct dye', x1, sy);
    g.fillText('reactive dye', x2, sy);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('van der Waals + H-bonds', x1, sy + 14);
    g.fillText('covalent C–O bond', x2, sy + 14);

    // Two stylised diagrams
    // Direct: dye hovering next to fibre (dashed)
    const dY = sy + 50;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x1 - 70, dY + 40); g.lineTo(x1 + 70, dY + 40); g.stroke();
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('cellulose chain', x1, dY + 56);
    // dye block above
    g.fillStyle = '#a3132d'; g.fillRect(x1 - 30, dY - 6, 60, 24);
    g.fillStyle = '#fff'; g.font = '10px serif'; g.fillText('dye', x1, dY + 8);
    // dashed (H-bond) connection
    g.strokeStyle = theme.inkAlpha(0.55); g.setLineDash([3, 3]); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x1 - 20, dY + 20); g.lineTo(x1 - 20, dY + 38);
    g.moveTo(x1 + 20, dY + 20); g.lineTo(x1 + 20, dY + 38);
    g.stroke();
    g.setLineDash([]);

    // Reactive: same but solid bond (no dashed)
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x2 - 70, dY + 40); g.lineTo(x2 + 70, dY + 40); g.stroke();
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('cellulose chain', x2, dY + 56);
    g.fillStyle = '#a3132d'; g.fillRect(x2 - 30, dY - 6, 60, 24);
    g.fillStyle = '#fff'; g.font = '10px serif'; g.fillText('dye', x2, dY + 8);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x2, dY + 18); g.lineTo(x2, dY + 40); g.stroke();
    g.fillStyle = theme.crimson; g.font = '10px serif';
    g.fillText('C–O', x2 + 14, dY + 32);

    // Bottom: two swatches with retention bars
    const by = sy + 130;
    const swW = 220, swH = 110;
    const swSpace = 80;
    // Direct
    g.fillStyle = `rgb(${Math.round(220 * directRetained + 235 * (1 - directRetained))},${Math.round(60 * directRetained + 230 * (1 - directRetained))},${Math.round(90 * directRetained + 230 * (1 - directRetained))})`;
    g.fillRect(x1 - swW / 2, by, swW, swH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x1 - swW / 2, by, swW, swH);
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText(`direct dye · ${(directRetained * 100).toFixed(0)}% retained`, x1, by + swH + 18);

    g.fillStyle = `rgb(${Math.round(220 * reactiveRetained + 235 * (1 - reactiveRetained))},${Math.round(60 * reactiveRetained + 230 * (1 - reactiveRetained))},${Math.round(90 * reactiveRetained + 230 * (1 - reactiveRetained))})`;
    g.fillRect(x2 - swW / 2, by, swW, swH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(x2 - swW / 2, by, swW, swH);
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText(`reactive dye · ${(reactiveRetained * 100).toFixed(0)}% retained`, x2, by + swH + 18);

    // Retention curves on the right
    const px = x2 + swW / 2 + 50, py = by, pw = w - px - M, ph = swH + 20;
    if (pw > 80) {
      g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
      g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('retention vs wash count', px + pw / 2, py - 4);
      // Curves
      const X = (n: number) => px + (n / 40) * pw;
      const Y = (r: number) => py + (1 - r) * ph;
      g.strokeStyle = '#a3132d'; g.lineWidth = 2;
      g.beginPath();
      for (let n = 0; n <= 40; n += 0.5) {
        const X0 = X(n), Y0 = Y(Math.exp(-0.08 * n));
        if (n === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
      }
      g.stroke();
      g.strokeStyle = '#1f7a4d'; g.lineWidth = 2;
      g.beginPath();
      for (let n = 0; n <= 40; n += 0.5) {
        const X0 = X(n), Y0 = Y(0.92 + 0.08 * Math.exp(-0.05 * n));
        if (n === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
      }
      g.stroke();
      // marker
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.arc(X(this.washes), Y(directRetained), 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(X(this.washes), Y(reactiveRetained), 4, 0, Math.PI * 2); g.fill();
      void swSpace;
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Procion dichlorotriazine (ICI 1956) was the first commercial reactive dye for cotton — solved the wash-fastness problem that direct dyes had for 80 years.', M, h - M);
  }
}

new ReactiveDye();
