import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class CameraPipeline {
  private stage: CanvasStage;
  private bright = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bright = hydrateNumber('bright', 100);
    const s = document.getElementById('bright') as EncSlider;
    s.value = this.bright;
    s.addEventListener('input', (e) => { this.bright = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('bright', () => Math.round(this.bright));
    document.addEventListener('reset-params', () => { this.bright = 100; s.value = 100; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const k = this.bright / 100;

    // four labelled panels: scene · lens · sensor · image
    const pad = 30, gap = 14, pw = (w - pad * 2 - gap * 3) / 4, py = 70, ph = h - 170;

    // scene
    const sx = pad;
    ctx.fillStyle = '#0e1a2b'; ctx.fillRect(sx, py, pw, ph);
    const sun = Math.min(1, k); ctx.fillStyle = `rgba(255,224,140,${sun})`;
    ctx.beginPath(); ctx.arc(sx + pw * 0.7, py + ph * 0.3, ph * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(46,120,80,${0.4 + 0.5 * k})`; ctx.fillRect(sx, py + ph * 0.65, pw, ph * 0.35); // ground
    ctx.fillStyle = `rgba(170,130,80,${0.6 + 0.4 * k})`; ctx.fillRect(sx + pw * 0.18, py + ph * 0.5, pw * 0.16, ph * 0.18); // house

    // lens
    const lx = sx + pw + gap;
    ctx.fillStyle = '#1a1714'; ctx.fillRect(lx, py, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.beginPath(); ctx.ellipse(lx + pw / 2, py + ph / 2, pw * 0.32, ph * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(lx + pw / 2, py + ph / 2, pw * 0.32, ph * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    // converging rays
    ctx.strokeStyle = `rgba(255,225,140,${0.4 + 0.5 * k})`; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { const y = py + ph / 2 + i * ph * 0.06; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + pw, py + ph / 2); ctx.stroke(); }

    // sensor — grid of photodetector cells with photon counts visualised by cell brightness
    const cx2 = lx + pw + gap;
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(cx2, py, pw, ph);
    const cols = 14, rows = 10, cw = pw / cols, chh = ph / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const counts = Math.round(Math.min(255, (60 + 12 * Math.sin(c * 0.7 + r * 0.4) + 90 * Math.random() * 0.1) * k));
      ctx.fillStyle = `rgb(${counts},${counts},${counts})`;
      ctx.fillRect(cx2 + c * cw + 0.5, py + r * chh + 0.5, cw - 1, chh - 1);
    }

    // image
    const ix = cx2 + pw + gap;
    ctx.fillStyle = `rgb(${Math.round(40 * k)},${Math.round(48 * k)},${Math.round(70 * k)})`; ctx.fillRect(ix, py, pw, ph);
    ctx.fillStyle = `rgba(255,224,140,${Math.min(1, k * 0.9)})`; ctx.beginPath(); ctx.arc(ix + pw * 0.7, py + ph * 0.3, ph * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgb(${Math.round(80 * k)},${Math.round(160 * k)},${Math.round(110 * k)})`; ctx.fillRect(ix, py + ph * 0.65, pw, ph * 0.35);
    ctx.fillStyle = `rgb(${Math.round(170 * k)},${Math.round(130 * k)},${Math.round(80 * k)})`; ctx.fillRect(ix + pw * 0.18, py + ph * 0.5, pw * 0.16, ph * 0.18);

    // labels
    ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ['scene', 'lens', 'sensor (grid of counts)', 'image'].forEach((t, i) => ctx.fillText(t, pad + i * (pw + gap) + pw / 2, py - 12));

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`scene ${Math.round(this.bright)}% → more or fewer photons per cell → lighter or darker numbers in the image`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new CameraPipeline());
