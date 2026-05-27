import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

/**
 * Brightness slider blends between two visualisations of the same beam:
 *   bright (b≈1)  → continuous sine wave (wave-like)
 *   dim   (b≈0)  → sparse Poisson-clicked photon dots (particle-like)
 */
class WhatIsLight {
  private stage: CanvasStage;
  private brightness = 0.7;
  private photons: { x: number; y: number; t: number }[] = [];
  private lastTime = 0;
  private animId = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    this.brightness = hydrateNumber('b', 70) / 100;
    (document.getElementById('b') as EncSlider).value = this.brightness * 100;
    registerStateParam('b', () => Math.round(this.brightness * 100));

    (document.getElementById('b') as EncSlider).addEventListener('input', (e) => {
      this.brightness = (e.target as EncSlider).value / 100;
      notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      (document.getElementById('b') as EncSlider).value = 70;
      this.brightness = 0.7; notifyStateChange();
    });

    this.animate(performance.now());
  }

  private animate = (now: number) => {
    const dt = Math.min(50, now - this.lastTime) / 1000;
    this.lastTime = now;
    const { w, h } = this.stage.logicalSize;
    if (w > 0 && h > 0) {
      // Photon birth — Poisson-ish: more births when dim has *fewer* but still some
      // Actually we want bright = many, dim = few
      const rate = 600 * this.brightness * this.brightness;
      const expected = rate * dt;
      const n = Math.random() < expected % 1 ? Math.floor(expected) + 1 : Math.floor(expected);
      for (let i = 0; i < n; i++) {
        this.photons.push({ x: 60, y: h / 2 + (Math.random() - 0.5) * 40, t: now });
      }
      // Advance and cull
      const speed = 220; // px/sec
      this.photons = this.photons.filter((p) => {
        p.x += speed * dt;
        return p.x < w - 30;
      });
      // Cap (dim case)
      if (this.photons.length > 800) this.photons.splice(0, this.photons.length - 800);
    }
    this.draw();
    this.animId = requestAnimationFrame(this.animate);
  };

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const cy = h / 2;
    const k = (2 * Math.PI) / 80;

    // Source (left) and detector (right) silhouettes
    ctx.fillStyle = theme.goldDeep;
    ctx.beginPath(); ctx.arc(40, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.fillRect(w - 30, cy - 24, 14, 48);
    ctx.fillStyle = theme.inkMute;
    ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('source', 26, cy + 26);
    ctx.fillText('detector', w - 50, cy + 36);

    // Wave envelope — opacity proportional to brightness
    const waveAlpha = this.brightness;
    if (waveAlpha > 0.01) {
      ctx.strokeStyle = `rgba(26, 26, 46, ${waveAlpha * 0.45})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let x = 55; x < w - 25; x++) {
        const y = cy + 36 * Math.sin(k * x + performance.now() / 200);
        if (x === 55) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Photon dots — visibility proportional to (1 - brightness) but always present
    ctx.fillStyle = theme.goldDeep;
    for (const p of this.photons) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Readout
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.goldDeep;
    ctx.fillText(`brightness = ${(this.brightness * 100).toFixed(0)}%`, 16, 28);
    ctx.fillText(`photons in flight ≈ ${this.photons.length}`, 16, 50);
    ctx.fillStyle = axisStyle.label;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(this.brightness > 0.6 ? 'WAVE-LIKE — coherent oscillation' :
                 this.brightness > 0.2 ? 'BLURRED — wave + grain' :
                 'PARTICLE-LIKE — discrete arrivals', 16, h - 18);
    void this.animId;
  }
}

window.addEventListener('DOMContentLoaded', () => new WhatIsLight());
