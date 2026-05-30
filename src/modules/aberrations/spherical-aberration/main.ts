import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const F0 = 300; // paraxial focal length (px)
const SA_COEF = 80; // longitudinal SA at h=1

class SA {
  private stage: CanvasStage;
  private h0 = 0.7;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.h0 = hydrateNumber('h', 0.7);
    const s = document.getElementById('h') as EncSlider; s.value = this.h0;
    s.addEventListener('input', (e) => { this.h0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('h', () => this.h0.toFixed(2));
    document.addEventListener('reset-params', () => { this.h0 = 0.7; s.value = 0.7; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const cy = h / 2;
    const lx = M + 120;
    const LSA = SA_COEF * Math.pow(this.h0, 2);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`h=${this.h0.toFixed(2)} · paraxial f=${F0}px · marginal f=${(F0 - LSA).toFixed(0)}px · LSA=${LSA.toFixed(1)}px`, M, M);

    // Axis
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(M, cy); g.lineTo(w - M, cy); g.stroke(); g.setLineDash([]);
    // Lens (vertical)
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    const apertureMax = 120;
    g.beginPath(); g.moveTo(lx, cy - apertureMax); g.lineTo(lx, cy + apertureMax); g.stroke();
    g.beginPath(); g.moveTo(lx - 6, cy - apertureMax + 8); g.lineTo(lx, cy - apertureMax); g.lineTo(lx + 6, cy - apertureMax + 8); g.stroke();
    g.beginPath(); g.moveTo(lx - 6, cy + apertureMax - 8); g.lineTo(lx, cy + apertureMax); g.lineTo(lx + 6, cy + apertureMax - 8); g.stroke();

    // Trace rays at heights 0..h0
    const heights = 9;
    for (let i = 0; i < heights; i++) {
      const hRel = (i + 1) / heights * this.h0;
      const yEntry = cy - hRel * apertureMax;
      // Focal point for this height: f = F0 - SA*h^2
      const fH = F0 - SA_COEF * Math.pow(hRel, 2);
      const focalX = lx + fH;
      // Ingoing ray: parallel
      g.strokeStyle = `rgba(190,60,40,${0.3 + 0.6 * hRel})`; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(M, yEntry); g.lineTo(lx, yEntry); g.stroke();
      // Outgoing: lens → focal point → past
      g.beginPath(); g.moveTo(lx, yEntry); g.lineTo(focalX, cy); g.lineTo(focalX + 80, cy + (cy - yEntry) * 80 / fH); g.stroke();
      // Symmetric below axis
      const yEntryB = cy + hRel * apertureMax;
      g.beginPath(); g.moveTo(M, yEntryB); g.lineTo(lx, yEntryB); g.stroke();
      g.beginPath(); g.moveTo(lx, yEntryB); g.lineTo(focalX, cy); g.lineTo(focalX + 80, cy - (yEntryB - cy) * 80 / fH); g.stroke();
    }

    // Mark paraxial and marginal foci
    g.fillStyle = theme.crimson;
    g.beginPath(); g.arc(lx + F0, cy, 5, 0, Math.PI * 2); g.fill();
    g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('Fparax', lx + F0, cy + 20);
    g.fillStyle = '#3a76a8';
    g.beginPath(); g.arc(lx + F0 - LSA, cy, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a76a8';
    g.fillText('Fmarg', lx + F0 - LSA, cy + 36);

    // LSA bracket
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(lx + F0 - LSA, cy - 50);
    g.lineTo(lx + F0 - LSA, cy - 55); g.lineTo(lx + F0, cy - 55); g.lineTo(lx + F0, cy - 50);
    g.stroke();
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`LSA = ${LSA.toFixed(1)} px`, lx + F0 - LSA / 2, cy - 60);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('LSA scales as h². Halving aperture quarters SA. Aspheric lenses or aplanatic shapes (Hecht §6) zero it out at design wavelength.', M, h - M);
  }
}

new SA();
