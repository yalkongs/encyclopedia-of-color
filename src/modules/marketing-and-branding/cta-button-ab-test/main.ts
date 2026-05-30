import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const PAGE_HUE = 150; // green page

function hsvCss(h: number, s: number, v: number): string {
  const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c;
  let r0 = 0, g0 = 0, b0 = 0;
  if (h < 60) [r0, g0, b0] = [c, x, 0];
  else if (h < 120) [r0, g0, b0] = [x, c, 0];
  else if (h < 180) [r0, g0, b0] = [0, c, x];
  else if (h < 240) [r0, g0, b0] = [0, x, c];
  else if (h < 300) [r0, g0, b0] = [x, 0, c];
  else [r0, g0, b0] = [c, 0, x];
  return `rgb(${Math.round((r0 + m) * 255)},${Math.round((g0 + m) * 255)},${Math.round((b0 + m) * 255)})`;
}

class CTA {
  private stage: CanvasStage;
  private h0 = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.h0 = hydrateNumber('h', 0);
    const s = document.getElementById('h') as EncSlider; s.value = this.h0;
    s.addEventListener('input', (e) => { this.h0 = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('h', () => Math.round(this.h0));
    document.addEventListener('reset-params', () => { this.h0 = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Hue distance to page hue (max 180°)
    let dh = Math.abs(this.h0 - PAGE_HUE);
    if (dh > 180) dh = 360 - dh;
    // Conversion-rate model: baseline 8%, peaks +25% at 180° distance
    const lift = 0.08 + 0.02 * (dh / 180);
    const baseline = 0.08;
    const liftPct = ((lift - baseline) / baseline) * 100;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`button hue ${this.h0}° · page hue ${PAGE_HUE}° · hue-distance ${dh.toFixed(0)}° · CR ${(lift * 100).toFixed(1)} % (+${liftPct.toFixed(0)}%)`, M, M);

    // Page mockup
    const px = M, py = M + 30, pw = (w - 2 * M) * 0.6, ph = h - 2 * M - 80;
    g.fillStyle = hsvCss(PAGE_HUE, 0.35, 0.94); g.fillRect(px, py, pw, ph);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(px, py, pw, ph);
    // Headline placeholder bars
    g.fillStyle = theme.inkAlpha(0.6); g.fillRect(px + 20, py + 20, pw - 40, 22);
    g.fillRect(px + 20, py + 60, (pw - 40) * 0.7, 12);
    g.fillRect(px + 20, py + 80, (pw - 40) * 0.85, 12);
    // CTA button
    const btnX = px + pw / 2 - 80, btnY = py + ph - 80, btnW = 160, btnH = 50;
    g.fillStyle = hsvCss(this.h0, 0.85, 0.85);
    g.fillRect(btnX, btnY, btnW, btnH);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(btnX, btnY, btnW, btnH);
    g.fillStyle = '#fff'; g.font = 'bold 16px serif'; g.textAlign = 'center';
    g.fillText('SIGN UP', btnX + btnW / 2, btnY + btnH / 2 + 6);

    // Conversion curve
    const cy = py + 20, cx = px + pw + 30, cw = w - cx - M, ch = ph - 40;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(cx, cy, cw, ch);
    g.fillStyle = theme.ink; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('conversion rate vs hue distance from page', cx + cw / 2, cy - 4);
    const X = (d: number) => cx + (d / 180) * cw;
    const Y = (cr: number) => cy + (1 - (cr - 0.05) / 0.06) * ch;
    g.strokeStyle = theme.crimson; g.lineWidth = 2; g.beginPath();
    for (let d0 = 0; d0 <= 180; d0 += 1) {
      const cr = 0.08 + 0.02 * (d0 / 180);
      const x = X(d0), y = Y(cr);
      if (d0 === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(X(dh), Y(lift), 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
    g.textAlign = 'left'; g.fillText('0° (no contrast)', cx, cy + ch + 14);
    g.textAlign = 'right'; g.fillText('180° (complement)', cx + cw, cy + ch + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Lesson from HubSpot "red beat green +21%": green was the page colour. The win was isolation, not red.', M, h - M);
  }
}

new CTA();
