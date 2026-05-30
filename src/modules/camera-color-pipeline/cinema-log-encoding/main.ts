import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// ARRI ALEXA LogC v3, EI 800 (linear → LogC code value 0..1)
function logC_alexa(t: number): number {
  const a = 5.555556, b = 0.052272, c = 0.247190, d = 0.385537;
  const e = 5.367655, f = 0.092809;
  const cut = 0.010591;
  if (t > cut) return c * Math.log10(a * t + b) + d;
  return e * t + f;
}

// Sony S-Log3 (linear → S-Log3 code value 0..1)
function sLog3_sony(t: number): number {
  if (t >= 0.01125) {
    return (420 + Math.log10((t + 0.01) / (0.18 + 0.01)) * 261.5) / 1023;
  }
  return ((t * (171.2102946929 - 95) / 0.01125) + 95) / 1023;
}

// Panasonic V-Log (linear → V-Log code value 0..1)
function vLog_panasonic(t: number): number {
  if (t < 0.01) return 5.6 * t + 0.125;
  return 0.241514 * Math.log10(t + 0.00873) + 0.598206;
}

const CURVES: { name: string; fn: (t: number) => number; color: string; gray: number }[] = [
  { name: 'ARRI Log C (EI 800)', fn: logC_alexa,        color: '#a3132d', gray: logC_alexa(0.18) },
  { name: 'Sony S-Log3',         fn: sLog3_sony,        color: '#1f7a4d', gray: sLog3_sony(0.18) },
  { name: 'Panasonic V-Log',     fn: vLog_panasonic,    color: '#b07c1f', gray: vLog_panasonic(0.18) },
];

class CinemaLog {
  private stage: CanvasStage;
  private stops = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.stops = hydrateNumber('stops', 0);
    const s = document.getElementById('stops') as EncSlider;
    s.value = this.stops;
    s.addEventListener('input', (e) => { this.stops = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('stops', () => Math.round(this.stops));
    document.addEventListener('reset-params', () => { this.stops = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  // stops → linear (relative to 18%) → 0.18 * 2^stops
  private linearFromStops(s: number): number {
    return 0.18 * Math.pow(2, s);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 50;
    const px = M + 10, py = M;
    const pw = w - 2 * M - 220;  // reserve right side for legend
    const ph = h - py - M - 30;

    // Axes: x = stops -6..+6, y = code value 0..1
    const sMin = -6, sMax = 6;
    const X = (s: number) => px + ((s - sMin) / (sMax - sMin)) * pw;
    const Y = (v: number) => py + (1 - v) * ph;

    // Axes
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif'; g.textAlign = 'center';
    for (let s = sMin; s <= sMax; s++) {
      g.beginPath(); g.moveTo(X(s), py + ph); g.lineTo(X(s), py + ph + 4); g.stroke();
      g.fillText(`${s > 0 ? '+' : ''}${s}`, X(s), py + ph + 18);
    }
    g.textAlign = 'right';
    for (let v = 0; v <= 1.01; v += 0.1) {
      g.beginPath(); g.moveTo(px - 4, Y(v)); g.lineTo(px, Y(v)); g.stroke();
      g.fillText(v.toFixed(1), px - 8, Y(v) + 4);
    }
    g.textAlign = 'center';
    g.fillText('exposure (stops, 0 = 18% mid-grey)', px + pw / 2, py + ph + 36);
    g.save(); g.translate(px - 32, py + ph / 2); g.rotate(-Math.PI / 2);
    g.fillText('encoded code value (0..1)', 0, 0); g.restore();

    // 18% line (mid-grey marker at stops=0)
    g.strokeStyle = theme.inkAlpha(0.3); g.setLineDash([4, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(0), py); g.lineTo(X(0), py + ph); g.stroke();
    g.setLineDash([]);

    // Draw each curve
    for (const c of CURVES) {
      g.strokeStyle = c.color; g.lineWidth = 2;
      g.beginPath();
      let first = true;
      for (let s = sMin; s <= sMax; s += 0.05) {
        const t = this.linearFromStops(s);
        let v = c.fn(t);
        v = Math.max(0, Math.min(1, v));
        const X0 = X(s), Y0 = Y(v);
        if (first) { g.moveTo(X0, Y0); first = false; } else g.lineTo(X0, Y0);
      }
      g.stroke();
      // mid-grey marker
      const gx = X(0), gy = Y(c.gray);
      g.fillStyle = c.color; g.beginPath(); g.arc(gx, gy, 4, 0, Math.PI * 2); g.fill();
    }

    // Slider crosshairs
    const tCur = this.linearFromStops(this.stops);
    const valC: [string, number][] = CURVES.map((c) => [c.name, c.fn(tCur)] as [string, number]);
    g.strokeStyle = theme.ink; g.lineWidth = 1; g.setLineDash([2, 4]);
    g.beginPath(); g.moveTo(X(this.stops), py); g.lineTo(X(this.stops), py + ph); g.stroke();
    g.setLineDash([]);

    // Legend on the right
    const lx = px + pw + 24;
    let ly = py + 10;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('code value at slider:', lx, ly);
    ly += 22;
    for (let i = 0; i < CURVES.length; i++) {
      g.fillStyle = CURVES[i].color;
      g.fillRect(lx, ly - 10, 16, 4);
      g.fillStyle = theme.ink; g.font = '12px serif';
      g.fillText(CURVES[i].name, lx + 22, ly);
      g.fillStyle = theme.inkAlpha(0.75); g.font = '11px monospace';
      g.fillText(`cv = ${valC[i][1].toFixed(3)}`, lx + 22, ly + 14);
      g.fillStyle = theme.inkAlpha(0.55); g.font = '10px serif';
      g.fillText(`mid-grey @ ${(CURVES[i].gray * 100).toFixed(1)}%`, lx + 22, ly + 28);
      ly += 50;
    }

    // Annotation
    g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText(`scene linear = 18% × 2^${this.stops} = ${(tCur * 100).toFixed(2)}%`, lx, ly + 20);
  }
}

new CinemaLog();
