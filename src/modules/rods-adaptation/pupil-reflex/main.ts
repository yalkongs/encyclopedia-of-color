import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const IRIS_MM = 12; // outer iris diameter, fixed reference scale

/** Empirical pupil diameter (mm) vs background luminance L (cd/m²). */
function pupilDiameter(logL: number): number {
  return 2 + 5 / (1 + Math.exp(logL + 0.5));
}

const SCENE_TICKS: Array<[number, string]> = [
  [-3, 'starlight'],
  [-1, 'moonlight'],
  [1.7, 'indoor'],
  [3, 'overcast'],
  [4.5, 'sunlight'],
];

class PupilReflex {
  private stage: CanvasStage;
  private logL = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.logL = hydrateNumber('logL', 1);
    (document.getElementById('logL') as EncSlider).value = this.logL;
    registerStateParam('logL', () => this.logL);
    (document.getElementById('logL') as EncSlider).addEventListener('input', (e) => {
      this.logL = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.logL = 1;
      (document.getElementById('logL') as EncSlider).value = 1;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const d = pupilDiameter(this.logL);
    const L = Math.pow(10, this.logL);
    // Scene brightness 0..1 mapped over the slider range for the backdrop tint.
    const bright = Math.min(1, Math.max(0, (this.logL + 4) / 10));

    // --- Luminance scale bar (top). ---
    const barX = w * 0.08, barY = h * 0.10, barW = w * 0.84, barH = 14;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#0b0b10');
    grad.addColorStop(1, '#f4f4ee');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    const xOfLog = (lg: number) => barX + ((lg + 4) / 10) * barW;
    ctx.font = '10px Inter, sans-serif';
    for (const [lg, label] of SCENE_TICKS) {
      const x = xOfLog(lg);
      ctx.strokeStyle = theme.inkAlpha(0.35);
      ctx.beginPath(); ctx.moveTo(x, barY + barH); ctx.lineTo(x, barY + barH + 5); ctx.stroke();
      ctx.fillStyle = theme.inkMute; ctx.textAlign = 'center';
      ctx.fillText(label, x, barY + barH + 17);
    }
    ctx.textAlign = 'left';
    // Current marker.
    const mx = xOfLog(this.logL);
    ctx.fillStyle = theme.crimson;
    ctx.beginPath(); ctx.moveTo(mx, barY - 8); ctx.lineTo(mx - 5, barY - 16); ctx.lineTo(mx + 5, barY - 16); ctx.closePath(); ctx.fill();

    // --- Eye front view (centre). ---
    const cx = w * 0.5, cy = h * 0.56;
    const irisPx = Math.min(w * 0.22, h * 0.26);
    const pupilPx = irisPx * (d / IRIS_MM);

    // Sclera backdrop tinted by scene brightness (intuition for ambient light).
    const sceneGray = Math.round(18 + bright * 210);
    ctx.fillStyle = `rgb(${sceneGray},${sceneGray},${Math.round(sceneGray * 0.96)})`;
    ctx.fillRect(0, cy - irisPx * 1.7, w, irisPx * 3.4);

    // Sclera (eyeball white) — soft almond.
    ctx.fillStyle = '#f6f1e6';
    ctx.beginPath();
    ctx.ellipse(cx, cy, irisPx * 2.1, irisPx * 1.35, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1.2; ctx.stroke();

    // Iris (radial gold→brown gradient).
    const ig = ctx.createRadialGradient(cx, cy, pupilPx, cx, cy, irisPx);
    ig.addColorStop(0, '#6b4a22');
    ig.addColorStop(0.6, theme.gold);
    ig.addColorStop(1, '#7a5a2c');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(cx, cy, irisPx, 0, 2 * Math.PI); ctx.fill();
    // Iris striations.
    ctx.strokeStyle = theme.inkAlpha(0.18); ctx.lineWidth = 1;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (pupilPx + 1), cy + Math.sin(a) * (pupilPx + 1));
      ctx.lineTo(cx + Math.cos(a) * irisPx, cy + Math.sin(a) * irisPx);
      ctx.stroke();
    }
    // Limbal ring.
    ctx.strokeStyle = theme.inkAlpha(0.45); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, irisPx, 0, 2 * Math.PI); ctx.stroke();

    // Pupil (black aperture).
    ctx.fillStyle = '#050507';
    ctx.beginPath(); ctx.arc(cx, cy, pupilPx, 0, 2 * Math.PI); ctx.fill();
    // Catch-light.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(cx - pupilPx * 0.32, cy - pupilPx * 0.32, Math.max(2, pupilPx * 0.16), 0, 2 * Math.PI); ctx.fill();

    // Diameter caliper across the pupil.
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cx - pupilPx, cy + irisPx + 14); ctx.lineTo(cx + pupilPx, cy + irisPx + 14); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx - pupilPx, cy + irisPx + 10); ctx.lineTo(cx - pupilPx, cy + irisPx + 18);
    ctx.moveTo(cx + pupilPx, cy + irisPx + 10); ctx.lineTo(cx + pupilPx, cy + irisPx + 18);
    ctx.stroke();

    // --- Readout. ---
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`L = ${L.toExponential(1)} cd/m²    pupil ⌀ = ${d.toFixed(1)} mm`, cx, h * 0.94);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new PupilReflex());
