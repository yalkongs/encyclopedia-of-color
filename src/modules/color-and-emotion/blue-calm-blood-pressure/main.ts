import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class BlueCalm {
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

  private hsv(h: number, s: number, v: number): string {
    const c = v * s; const x = c * (1 - Math.abs(((h * 6) % 2) - 1)); const m = v - c;
    let r0 = 0, g0 = 0, b0 = 0;
    const seg = Math.floor(h * 6);
    if (seg === 0) [r0, g0, b0] = [c, x, 0];
    else if (seg === 1) [r0, g0, b0] = [x, c, 0];
    else if (seg === 2) [r0, g0, b0] = [0, c, x];
    else if (seg === 3) [r0, g0, b0] = [0, x, c];
    else if (seg === 4) [r0, g0, b0] = [x, 0, c];
    else [r0, g0, b0] = [c, 0, x];
    return `rgb(${Math.round((r0 + m) * 255)},${Math.round((g0 + m) * 255)},${Math.round((b0 + m) * 255)})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Hue 0..1 maps to red (0) -> ... -> blue (0.67) -> magenta (1.0). Calm peak near blue.
    const hue = this.h0;
    // Inverted U around hue=0.67 (blue)
    const calmness = Math.exp(-((hue - 0.67) ** 2) / 0.04);
    const bp = 130 - 5 * calmness;
    const heart = 78 - 5 * calmness;

    const huedeg = hue * 360;
    const col = this.hsv(hue * 0.83, 0.5, 0.85); // map to ~0..300° avoiding magenta

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`hue ${huedeg.toFixed(0)}° · systolic ${bp.toFixed(1)} mmHg · HR ${heart.toFixed(1)} bpm · calmness index ${calmness.toFixed(2)}`, M, M);

    // Room scene
    const rx = M, ry = M + 30, rw = 320, rh = 240;
    g.fillStyle = col; g.fillRect(rx, ry, rw, rh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(rx, ry, rw, rh);
    // Bed silhouette
    g.fillStyle = '#f8f4ec'; g.fillRect(rx + 60, ry + 130, 200, 70);
    g.fillStyle = '#aac0d8'; g.fillRect(rx + 60, ry + 110, 60, 30); // pillow
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('pre-op hospital ward', rx + rw / 2, ry + rh + 16);

    // Calmness arc
    const cx = rx + rw + 40, cy = ry + 100, cr = 90;
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 12; g.beginPath();
    g.arc(cx, cy, cr, Math.PI, 2 * Math.PI); g.stroke();
    g.strokeStyle = '#3a76a8'; g.lineWidth = 12; g.beginPath();
    g.arc(cx, cy, cr, Math.PI, Math.PI + calmness * Math.PI); g.stroke();
    g.fillStyle = theme.ink; g.font = 'bold 14px serif'; g.textAlign = 'center';
    g.fillText('calmness', cx, cy - 24);
    g.font = '20px serif'; g.fillStyle = '#3a76a8';
    g.fillText(`${(calmness * 100).toFixed(0)}%`, cx, cy + 6);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Effect is small — building-design literature finds context (lighting, plants, view) often dominates over wall colour alone.', M, h - M);
  }
}

new BlueCalm();
