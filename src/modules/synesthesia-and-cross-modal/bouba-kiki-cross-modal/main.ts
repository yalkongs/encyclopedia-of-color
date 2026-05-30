import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class BoubaKiki {
  private stage: CanvasStage;
  private n = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.n = hydrateNumber('n', 1);
    const s = document.getElementById('n') as EncSlider; s.value = this.n;
    s.addEventListener('input', (e) => { this.n = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('n', () => Math.round(this.n));
    document.addEventListener('reset-params', () => { this.n = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const isBouba = this.n === 1;
    const focusCol = isBouba ? '#3a76a8' : '#c2382c';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`focus name: ${isBouba ? '"bouba" (95% pick the round blob)' : '"kiki" (95% pick the spiky shape)'}`, M, M);

    // Two shapes side by side
    const sx = M, sy = M + 40, sw = (w - 2 * M) / 2, sh = h - 2 * M - 100;
    // Round blob (left)
    g.fillStyle = isBouba ? focusCol : '#aaaaaa';
    g.beginPath();
    const cx = sx + sw / 2, cy = sy + sh / 2;
    const r = sh / 2.6;
    g.moveTo(cx + r, cy);
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const rr = r * (1 + 0.1 * Math.sin(a * 3));
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    g.fillStyle = theme.ink; g.font = isBouba ? 'bold 18px serif' : '18px serif'; g.textAlign = 'center';
    g.fillText(isBouba ? '← "bouba" 95%' : '"bouba" 5%', cx, sy + sh + 24);

    // Spiky shape (right)
    const sx2 = sx + sw, cx2 = sx2 + sw / 2, cy2 = sy + sh / 2;
    g.fillStyle = !isBouba ? focusCol : '#aaaaaa';
    g.beginPath();
    const spikes = 7;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.4;
      const x = cx2 + Math.cos(a) * rr, y = cy2 + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    g.fillStyle = theme.ink; g.font = !isBouba ? 'bold 18px serif' : '18px serif';
    g.fillText(!isBouba ? '← "kiki" 95%' : '"kiki" 5%', cx2, sy + sh + 24);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Replicates across cultures and pre-literate kids — the mapping is partly motor (open vs constrained vocal-tract shape).', M, h - M);
  }
}

new BoubaKiki();
