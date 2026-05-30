import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const SOURCES = [
  { name: 'HeNe laser', dLam: 0.001, Lc_um: 360e3 },
  { name: 'red LED', dLam: 12, Lc_um: 30 },
  { name: 'sunlight', dLam: 350, Lc_um: 1.03 },
];

class Coherence {
  private stage: CanvasStage;
  private src = 2;
  private d = 30;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.src = hydrateNumber('src', 2);
    this.d = hydrateNumber('d', 30);
    const s1 = document.getElementById('src') as EncSlider; s1.value = this.src;
    const s2 = document.getElementById('d') as EncSlider; s2.value = this.d;
    s1.addEventListener('input', (e) => { this.src = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    s2.addEventListener('input', (e) => { this.d = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('src', () => Math.round(this.src));
    registerStateParam('d', () => Math.round(this.d));
    document.addEventListener('reset-params', () => {
      this.src = 2; this.d = 30; s1.value = 2; s2.value = 30; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = SOURCES[this.src - 1];
    const x = Math.PI * this.d / sel.Lc_um;
    const V = x === 0 ? 1 : Math.abs(Math.sin(x) / x);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name}: Δλ=${sel.dLam} nm, L_c=${sel.Lc_um >= 1000 ? (sel.Lc_um / 1000).toFixed(1) + ' mm' : sel.Lc_um.toFixed(2) + ' μm'} · Δ=${this.d} μm · V=${V.toFixed(3)}`, M, M);

    // Fringe pattern image
    const fX = M, fY = M + 40, fW = (w - 2 * M) * 0.5, fH = 80;
    for (let i = 0; i < fW; i++) {
      const v = 0.5 + 0.5 * V * Math.cos(2 * Math.PI * i / 18);
      const ch = Math.round(v * 255);
      g.fillStyle = `rgb(${Math.round(0.7 * ch + 50)},${Math.round(0.2 * ch)},${Math.round(0.1 * ch)})`;
      g.fillRect(fX + i, fY, 1, fH);
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(fX, fY, fW, fH);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`Michelson fringes at Δ = ${this.d} μm`, fX + fW / 2, fY + fH + 16);

    // V vs Δ curve for all three sources
    const cy = fY + fH + 60, cx = fX, cw = w - 2 * M, ch = 180;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('visibility V(Δ) for three sources (log-x)', cx + cw / 2, cy - 4);
    const X = (dd: number) => cx + Math.log10(Math.max(0.1, dd) / 0.1) / Math.log10(1e6 / 0.1) * cw;
    const Y = (vv: number) => cy + (1 - vv) * ch;
    const colors = ['#1f3a8a', '#c2382c', '#c8a020'];
    for (let i = 0; i < SOURCES.length; i++) {
      g.strokeStyle = colors[i]; g.lineWidth = 2; g.beginPath();
      let drew = false;
      for (let dd = 0.1; dd <= 1e6; dd *= 1.1) {
        const xx = Math.PI * dd / SOURCES[i].Lc_um;
        const vv = xx === 0 ? 1 : Math.abs(Math.sin(xx) / xx);
        const px = X(dd), py = Y(vv);
        if (!drew) { g.moveTo(px, py); drew = true; } else g.lineTo(px, py);
      }
      g.stroke();
      g.fillStyle = colors[i]; g.font = '10px serif'; g.textAlign = 'left';
      g.fillText(SOURCES[i].name, cx + 8, cy + 14 + i * 14);
    }
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.d), Y(V), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('0.1 μm', cx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('1 m', cx + cw, cy + ch + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Laser holography needs the path imbalance < L_c. OCT (optical coherence tomography) exploits short L_c to slice biological tissue.', M, h - M);
  }
}

new Coherence();
