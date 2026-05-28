import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { BLIND_SPOT_DEG, BLIND_SPOT_WIDTH_DEG } from '@core/render/eye';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class BlindSpot {
  private stage: CanvasStage;
  private angle = 15.5; // target eccentricity (deg)

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.angle = hydrateNumber('angle', 15.5);
    (document.getElementById('angle') as EncSlider).value = this.angle;
    registerStateParam('angle', () => this.angle);
    (document.getElementById('angle') as EncSlider).addEventListener('input', (e) => {
      this.angle = (e.target as EncSlider).value;
      this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.angle = 15.5;
      (document.getElementById('angle') as EncSlider).value = 15.5;
      this.draw(); notifyStateChange();
    });
  }

  private inBlindSpot(): boolean {
    return Math.abs(this.angle - BLIND_SPOT_DEG) <= BLIND_SPOT_WIDTH_DEG / 2;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const hidden = this.inBlindSpot();

    // --- Stimulus card (top). ---
    const cardX = w * 0.08, cardY = h * 0.12, cardW = w * 0.84, cardH = h * 0.30;
    ctx.fillStyle = '#fbf6e8';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    const fixX = cardX + cardW * 0.18, midY = cardY + cardH * 0.5;
    // Fixation cross.
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(fixX - 9, midY); ctx.lineTo(fixX + 9, midY); ctx.moveTo(fixX, midY - 9); ctx.lineTo(fixX, midY + 9); ctx.stroke();
    // Target dot at eccentricity (30° → near right edge).
    const dotX = fixX + (this.angle / 30) * (cardW * 0.72);
    ctx.fillStyle = hidden ? 'rgba(26,26,46,0.12)' : theme.ink;
    ctx.beginPath(); ctx.arc(dotX, midY, 9, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('fixate +  (right eye)', fixX - 30, cardY + cardH + 16);
    if (hidden) {
      ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText('dot vanishes — on your blind spot', dotX - 80, midY - 18);
    }

    // --- Retina map (bottom): fovea at centre, optic disc band at 15.5°. ---
    const ry = h * 0.66, rx0 = w * 0.10, rx1 = w * 0.90, rmidX = (rx0 + rx1) / 2;
    const degToX = (deg: number) => rmidX + (deg / 30) * ((rx1 - rx0) / 2);
    // Retina baseline.
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.stroke();
    // Optic-disc (blind) band.
    const b0 = degToX(BLIND_SPOT_DEG - BLIND_SPOT_WIDTH_DEG / 2);
    const b1 = degToX(BLIND_SPOT_DEG + BLIND_SPOT_WIDTH_DEG / 2);
    ctx.fillStyle = theme.crimsonAlpha(0.18);
    ctx.fillRect(b0, ry - 26, b1 - b0, 52);
    ctx.strokeStyle = theme.crimson; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.strokeRect(b0, ry - 26, b1 - b0, 52); ctx.setLineDash([]);
    ctx.fillStyle = theme.crimson; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('optic disc (no receptors)', b0 - 20, ry + 42);
    // Fovea.
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(rmidX, ry, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('fovea', rmidX - 14, ry - 30);
    // Dot's retinal image position.
    ctx.fillStyle = hidden ? theme.crimson : theme.ink;
    ctx.beginPath(); ctx.arc(degToX(this.angle), ry, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = theme.inkMute;
    ctx.fillText("dot's image", degToX(this.angle) - 26, ry + 24);

    // Eccentricity ticks.
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    for (let d = 0; d <= 30; d += 10) ctx.fillText(`${d}°`, degToX(d) - 6, ry - 12);

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`target eccentricity = ${this.angle.toFixed(1)}°   (blind spot ≈ ${BLIND_SPOT_DEG}°)`, cardX, h * 0.9);
  }
}
window.addEventListener('DOMContentLoaded', () => new BlindSpot());
