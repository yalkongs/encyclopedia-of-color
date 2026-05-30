import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

function gauss(): number {
  const u1 = Math.random() || 1e-9, u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// f-number choices for "aperture stops": f/1.4, 2, 2.8, 4, 5.6, 8, 11, 16
// shutter choices in 1/x: 1, 2, 4, 8, 15, 30, 60, 125, 250, 500
// ISO choices: 50, 100, 200, 400, 800, 1600, 3200, 6400
const F_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
const SHUTTER_STOPS = [1, 2, 4, 8, 15, 30, 60, 125, 250, 500];
const ISO_STOPS = [50, 100, 200, 400, 800, 1600, 3200, 6400];

// Stops contribution: aperture stops = log2(f²/baseline²) — open one stop = halve f-number squared = double light. baseline f/8 = 0
// Light = ISO * shutter_time / f²
function evValue(fStop: number, shutterOneOverX: number, iso: number): number {
  // EV = log2( N² / t ) for ISO 100. Adjust for different ISO.
  // Standard formula: EV(ISO 100) = log2(N²/t). At ISO X, working EV = EV(100) − log2(X/100)
  return Math.log2((fStop * fStop) * shutterOneOverX) - Math.log2(iso / 100);
}

class ExposureTriangle {
  private stage: CanvasStage;
  private aperture = 40;   // slider 0..80 maps to f-stops
  private shutter = 125;   // slider 0..500 maps to 1/x s
  private iso = 400;       // slider 100..6400

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.aperture = hydrateNumber('aperture', 40);
    this.shutter = hydrateNumber('shutter', 125);
    this.iso = hydrateNumber('iso', 400);

    const sA = document.getElementById('aperture') as EncSlider; sA.value = this.aperture;
    sA.addEventListener('input', (e) => { this.aperture = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sS = document.getElementById('shutter') as EncSlider; sS.value = this.shutter;
    sS.addEventListener('input', (e) => { this.shutter = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const sI = document.getElementById('iso') as EncSlider; sI.value = this.iso;
    sI.addEventListener('input', (e) => { this.iso = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    registerStateParam('aperture', () => Math.round(this.aperture));
    registerStateParam('shutter', () => Math.round(this.shutter));
    registerStateParam('iso', () => Math.round(this.iso));

    document.addEventListener('reset-params', () => {
      this.aperture = 40; this.shutter = 125; this.iso = 400;
      sA.value = 40; sS.value = 125; sI.value = 400;
      this.draw(); notifyStateChange();
    });
  }

  // Quantize slider value to nearest stop value
  private snapAperture(v: number): number {
    let best = F_STOPS[0], dist = Infinity;
    for (const f of F_STOPS) { const d = Math.abs(f * 10 - v); if (d < dist) { dist = d; best = f; } }
    return best;
  }
  private snapShutter(v: number): number {
    let best = SHUTTER_STOPS[0], dist = Infinity;
    for (const t of SHUTTER_STOPS) { const d = Math.abs(t - v); if (d < dist) { dist = d; best = t; } }
    return best;
  }
  private snapISO(v: number): number {
    let best = ISO_STOPS[0], dist = Infinity;
    for (const i of ISO_STOPS) { const d = Math.abs(i - v); if (d < dist) { dist = d; best = i; } }
    return best;
  }

  // Render scene preview: background blur (DoF), motion blur (shutter), noise (ISO)
  private renderScene(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fStop: number, shutter: number, iso: number, exposureMul: number) {
    // Background gradient
    const grad = g.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#dccbb0'); grad.addColorStop(1, '#9b8772');
    g.fillStyle = grad; g.fillRect(x, y, w, h);

    // Background depth-of-field blur: blur strength inversely proportional to f-number
    const blurR = Math.max(0.5, (8 - Math.log2(fStop)) * 1.5);
    g.save();
    g.filter = `blur(${blurR.toFixed(1)}px)`;
    // Distant pattern (squares "trees")
    for (let i = 0; i < 8; i++) {
      const tx = x + 30 + i * (w - 60) / 8;
      const ty = y + h * 0.18;
      g.fillStyle = `rgba(60,80,40,0.6)`;
      g.fillRect(tx, ty, 18, 32);
    }
    g.restore();

    // Foreground subject (sharp, in focus regardless of f-stop) — a "ball" with motion blur
    // Motion blur: longer shutter (smaller 1/x) → more blur
    const shutterSec = 1 / shutter;
    const motionBlurPx = Math.min(60, shutterSec * 200);
    g.save();
    g.filter = `blur(${(motionBlurPx * 0.2).toFixed(1)}px)`;
    g.fillStyle = '#a3132d';
    for (let k = 0; k < 6; k++) {
      const dx = -motionBlurPx * k / 5;
      g.globalAlpha = 0.18 + (k === 0 ? 0.4 : 0);
      g.beginPath(); g.arc(x + w * 0.6 + dx, y + h * 0.55, 22, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1.0;
    g.restore();

    // Apply ISO noise as overlay
    const noiseSigma = Math.log2(iso / 100) * 6;
    if (noiseSigma > 0.5) {
      const img = g.getImageData(x, y, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = noiseSigma * gauss();
        img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
        img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
        img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
      }
      g.putImageData(img, x, y);
    }

    // Apply over/under exposure (exposureMul = 1 means correct)
    if (Math.abs(exposureMul - 1) > 0.05) {
      g.fillStyle = exposureMul > 1 ? `rgba(255,255,255,${Math.min(0.8, (exposureMul - 1) * 0.5)})` : `rgba(0,0,0,${Math.min(0.8, (1 - exposureMul) * 0.7)})`;
      g.fillRect(x, y, w, h);
    }

    g.strokeStyle = theme.inkAlpha(0.6);
    g.strokeRect(x, y, w, h);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 28;
    // Snap slider values to nearest stop
    const fStop = this.snapAperture(this.aperture);
    const shutter = this.snapShutter(this.shutter);
    const iso = this.snapISO(this.iso);

    const ev = evValue(fStop, shutter, iso);
    const targetEV = 14; // Sunny 16 at ISO 100: log2(16²/100) ≈ 14 (loose target for "correct exposure")
    const evDiff = ev - targetEV;
    const exposureMul = Math.pow(2, -evDiff); // multiplier for radiance

    // Top: settings & EV readout
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`f/${fStop}  ·  1/${shutter} s  ·  ISO ${iso}`, M, M);
    g.fillStyle = Math.abs(evDiff) < 0.5 ? theme.gold : theme.crimson; g.font = '12px serif';
    g.fillText(`EV = ${ev.toFixed(2)}   (target ≈ ${targetEV})   ${evDiff > 0.5 ? '— underexposed' : evDiff < -0.5 ? '— overexposed' : '— correct'}`, M, M + 18);

    // Three mini-panels for side effects + big composite at bottom
    const miniW = (w - 4 * M) / 3;
    const miniH = 110;
    const my = M + 36;

    // Mini 1: aperture effect (only DoF, full sharp foreground, no motion blur, no noise)
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(`f/${fStop} → DoF blur`, M, my - 2);
    this.renderScene(g, M, my, miniW, miniH, fStop, 250, 100, 1);

    // Mini 2: shutter effect (only motion blur, deep DoF)
    g.fillText(`1/${shutter} s → motion blur`, M * 2 + miniW, my - 2);
    this.renderScene(g, M * 2 + miniW, my, miniW, miniH, 16, shutter, 100, 1);

    // Mini 3: ISO effect (only noise)
    g.fillText(`ISO ${iso} → noise`, M * 3 + miniW * 2, my - 2);
    this.renderScene(g, M * 3 + miniW * 2, my, miniW, miniH, 16, 250, iso, 1);

    // Big composite (all three at chosen exposure)
    const by = my + miniH + 36;
    const bH = h - by - M - 20;
    g.fillStyle = theme.crimson; g.font = '13px serif';
    g.fillText('combined preview (EV-adjusted)', M, by - 6);
    this.renderScene(g, M, by, w - 2 * M, bH, fStop, shutter, iso, exposureMul);
  }
}

new ExposureTriangle();
