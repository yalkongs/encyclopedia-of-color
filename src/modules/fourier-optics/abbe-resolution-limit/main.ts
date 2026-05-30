import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const LAMBDA = 550; // nm

class Abbe {
  private stage: CanvasStage;
  private na = 0.95;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.na = hydrateNumber('na', 0.95);
    const s = document.getElementById('na') as EncSlider; s.value = this.na;
    s.addEventListener('input', (e) => { this.na = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('na', () => this.na.toFixed(2));
    document.addEventListener('reset-params', () => { this.na = 0.95; s.value = 0.95; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const d = LAMBDA / (2 * this.na);
    const requiresOil = this.na > 1.0;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`λ = ${LAMBDA} nm · NA = ${this.na.toFixed(2)} · d = λ/(2 NA) = ${d.toFixed(0)} nm${requiresOil ? ' · oil immersion REQUIRED' : ''}`, M, M);

    // Diffraction-cone geometry (left)
    const cx0 = M + 200, cy0 = M + 200;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    // Sample plane
    g.beginPath(); g.moveTo(cx0 - 120, cy0 + 100); g.lineTo(cx0 + 120, cy0 + 100); g.stroke();
    // Objective lens (top)
    g.fillStyle = '#1a3a8a';
    g.beginPath(); g.moveTo(cx0 - 60, cy0 - 60); g.lineTo(cx0 + 60, cy0 - 60); g.lineTo(cx0 + 80, cy0 - 30); g.lineTo(cx0 - 80, cy0 - 30); g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.stroke();
    g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('objective', cx0, cy0 - 42);

    // Acceptance cone (half-angle = asin(NA/n))
    const n = requiresOil ? 1.515 : 1.0;
    const alpha = Math.asin(Math.min(1, this.na / n));
    g.fillStyle = 'rgba(150,200,255,0.3)';
    g.beginPath();
    g.moveTo(cx0, cy0 + 100);
    g.lineTo(cx0 - 130 * Math.tan(alpha), cy0 - 30);
    g.lineTo(cx0 + 130 * Math.tan(alpha), cy0 - 30);
    g.closePath(); g.fill();
    // Immersion oil
    if (requiresOil) {
      g.fillStyle = 'rgba(220,200,80,0.4)';
      g.beginPath();
      g.moveTo(cx0 - 120, cy0 + 100); g.lineTo(cx0 + 120, cy0 + 100);
      g.lineTo(cx0 + 80, cy0 - 30); g.lineTo(cx0 - 80, cy0 - 30); g.closePath(); g.fill();
      g.fillStyle = '#7a5810'; g.font = 'bold 10px serif'; g.textAlign = 'center';
      g.fillText('oil n=1.515', cx0, cy0 + 50);
    }
    // Sample grating (period d, scaled)
    const periodPx = d / 8;
    g.fillStyle = '#1a1a1a';
    for (let i = -3; i <= 3; i++) {
      g.fillRect(cx0 + i * periodPx - periodPx / 4, cy0 + 100 - 8, periodPx / 2, 16);
    }
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`period d = ${d.toFixed(0)} nm`, cx0, cy0 + 130);
    // Alpha label
    g.fillStyle = theme.ink; g.font = '11px serif';
    g.fillText(`α = ${(alpha * 180 / Math.PI).toFixed(0)}°`, cx0 + 50, cy0 + 30);

    // Resolution vs NA curve (right)
    const px = cx0 + 180, py = M + 40, pw = w - px - M, ph = 240;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('resolution d (nm) vs NA at 550 nm', px + pw / 2, py - 4);
    const X = (na: number) => px + ((na - 0.1) / 1.3) * pw;
    const Y = (dd: number) => py + (1 - (3000 - dd) / 2800) * ph;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let nn = 0.1; nn <= 1.4; nn += 0.01) {
      const dd = LAMBDA / (2 * nn);
      const x = X(nn), y = Y(dd);
      if (nn === 0.1) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(this.na), Y(d), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('NA 0.1', px, py + ph + 14);
    g.textAlign = 'right'; g.fillText('NA 1.4 (oil)', px + pw, py + ph + 14);

    // STED note
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('STED super-resolution: 30-50 nm at λ = 550 nm (Hell, Nobel 2014).', px, py + ph + 32);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Abbe (1873) derived this while consulting for Zeiss — turned microscope design from craft to engineering.', M, h - M);
  }
}

new Abbe();
