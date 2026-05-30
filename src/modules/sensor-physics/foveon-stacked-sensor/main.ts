import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Silicon absorption coefficient α(λ) [µm⁻¹] — approximate, fit to published Si data
// References: Green 1995, Si optical absorption tables
function alphaSi(lambda: number): number {
  // Returns α in µm⁻¹
  if (lambda < 400) return 35;
  if (lambda < 500) return 4.5 - (lambda - 400) / 100 * 3.5; // ~4.5 at 400, ~1 at 500
  if (lambda < 600) return 1 - (lambda - 500) / 100 * 0.7;   // ~1 at 500, ~0.3 at 600
  if (lambda < 700) return 0.3 - (lambda - 600) / 100 * 0.25; // ~0.3 at 600, ~0.05 at 700
  return 0.02;
}

// 1/e penetration depth (µm)
function penDepth(lambda: number): number {
  return 1 / alphaSi(lambda);
}

// Photodiode placements (µm below surface) — Foveon X3 approx
const DEPTHS = { B: 0.2, G: 1.0, R: 3.0 };

// Wavelength → sRGB CSS for the incident-light strip
function wavelengthToCss(lambda: number): string {
  // Crude visible-spectrum mapping
  let r = 0, g = 0, b = 0;
  if (lambda < 440) { r = (440 - lambda) / 60; g = 0; b = 1; }
  else if (lambda < 490) { r = 0; g = (lambda - 440) / 50; b = 1; }
  else if (lambda < 510) { r = 0; g = 1; b = (510 - lambda) / 20; }
  else if (lambda < 580) { r = (lambda - 510) / 70; g = 1; b = 0; }
  else if (lambda < 645) { r = 1; g = (645 - lambda) / 65; b = 0; }
  else { r = 1; g = 0; b = 0; }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

class Foveon {
  private stage: CanvasStage;
  private lambda = 450;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 450);
    const s = document.getElementById('lambda') as EncSlider; s.value = this.lambda;
    s.addEventListener('input', (e) => { this.lambda = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lambda', () => Math.round(this.lambda));
    document.addEventListener('reset-params', () => { this.lambda = 450; s.value = 450; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 40;

    // Title
    const a = alphaSi(this.lambda);
    const depth = penDepth(this.lambda);

    // Cross-section: vertical silicon block; depth axis 0..5 µm
    const csX = M, csY = M + 40, csW = (w - 3 * M) * 0.42, csH = h - csY - M - 60;
    const depthMax = 5; // µm
    const depthY = (d: number) => csY + (d / depthMax) * csH;

    // Silicon block (greyish)
    g.fillStyle = '#2a2a2e'; g.fillRect(csX, csY, csW, csH);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(csX, csY, csW, csH);

    // Incident ray (top) tinted by wavelength
    g.fillStyle = wavelengthToCss(this.lambda);
    g.fillRect(csX, csY - 16, csW, 16);
    g.fillStyle = theme.paperBg; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`incident: ${this.lambda} nm`, csX + csW / 2, csY - 4);

    // Intensity profile I(z) = I0 * exp(-α z), shown as colour gradient down the block
    const steps = 50;
    for (let i = 0; i < steps; i++) {
      const z0 = (i / steps) * depthMax;
      const I = Math.exp(-a * z0);
      const y = depthY(z0);
      const yNext = depthY((i + 1) / steps * depthMax);
      // Modulate the colour intensity
      const rgb = wavelengthToCss(this.lambda);
      // Apply alpha
      g.fillStyle = rgb.replace('rgb(', 'rgba(').replace(')', `,${(I * 0.9).toFixed(3)})`);
      g.fillRect(csX, y, csW, yNext - y + 1);
    }

    // Depth axis labels
    g.fillStyle = theme.inkAlpha(0.75); g.font = '10px serif'; g.textAlign = 'right';
    for (let d = 0; d <= depthMax; d++) {
      g.fillText(`${d} µm`, csX - 4, depthY(d) + 4);
    }
    g.save(); g.translate(csX - 30, csY + csH / 2); g.rotate(-Math.PI / 2);
    g.textAlign = 'center'; g.fillText('depth below surface', 0, 0); g.restore();

    // Photodiode markers + per-band signal
    const photoColors = { B: '#3478ff', G: '#33cc55', R: '#e63a4d' };
    for (const band of ['B', 'G', 'R'] as const) {
      const z = DEPTHS[band];
      const y = depthY(z);
      g.fillStyle = photoColors[band];
      g.fillRect(csX - 14, y - 5, csW + 28, 10);
      g.strokeStyle = theme.ink; g.lineWidth = 1; g.strokeRect(csX - 14, y - 5, csW + 28, 10);
      g.fillStyle = '#fff'; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${band} @ ${z} µm`, csX + csW / 2, y + 3);
    }

    // 1/e penetration depth marker
    g.strokeStyle = theme.gold; g.lineWidth = 2; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(csX, depthY(depth)); g.lineTo(csX + csW, depthY(depth)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.gold; g.font = '11px serif'; g.textAlign = 'left';
    if (depth < depthMax) g.fillText(`1/e depth = ${depth.toFixed(2)} µm`, csX + csW + 4, depthY(depth) + 4);

    // Right panel: per-band signal bars + readout
    const rx = csX + csW + M;
    const rw = w - rx - M;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('per-photodiode signal (integrated above each depth):', rx, csY);

    // Signal: integrate from surface to photodiode depth — fraction absorbed in that layer
    // Approximate as I(z_above) - I(z_below) where z_below = z + 0.3µm thickness
    const layerThickness = 0.4;
    const bands = ['B', 'G', 'R'] as const;
    for (let i = 0; i < 3; i++) {
      const band = bands[i];
      const z = DEPTHS[band];
      const sig = Math.exp(-a * (z - layerThickness / 2)) - Math.exp(-a * (z + layerThickness / 2));
      const by = csY + 30 + i * 60;
      g.fillStyle = theme.ink; g.font = '12px serif';
      g.fillText(`${band} layer (z=${z} µm)`, rx, by);
      g.fillStyle = photoColors[band];
      g.fillRect(rx, by + 6, sig * rw, 16);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(rx, by + 6, rw, 16);
      g.fillStyle = theme.inkAlpha(0.75); g.font = '11px monospace';
      g.fillText(`${(sig * 100).toFixed(1)}%`, rx + sig * rw + 6, by + 18);
    }

    // Footnote: comparison vs Bayer
    const fy = csY + 30 + 3 * 60 + 20;
    g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('vs Bayer:', rx, fy);
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif';
    g.fillText('• Bayer = 1 colour filter per pixel + demosaic interpolation', rx, fy + 16);
    g.fillText('• Foveon = 3 readings per pixel from depth; no demosaic, no aliasing', rx, fy + 32);
    g.fillText('• trade-off: small per-channel pixels → more dark noise', rx, fy + 48);
  }
}

new Foveon();
