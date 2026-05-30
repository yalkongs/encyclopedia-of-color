import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class GrainNoise {
  private stage: CanvasStage;
  private iso = 800;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.iso = hydrateNumber('iso', 800);
    const s = document.getElementById('iso') as EncSlider;
    s.value = this.iso;
    s.addEventListener('input', (e) => { this.iso = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('iso', () => Math.round(this.iso));
    document.addEventListener('reset-params', () => { this.iso = 800; s.value = 800; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const labelH = 28;
    const panelW = (w - 3 * M) / 2;
    const panelH = h - 2 * M - labelH - 60;

    // Base grey value for the patch (~50% reflectance)
    const meanGrey = 138;

    // Crystal size scales with ISO
    const crystalSize = 1.0 + (this.iso - 100) / 600;
    // Noise sigma scales with ISO too (sqrt-ish; faux but visually obvious)
    const noiseSigma = 4 + (this.iso - 100) / 30;

    // Left panel — film grain
    const leftX = M, leftY = M + labelH;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'center';
    g.fillText(`Film grain (silver crystals) — ISO ${this.iso}`, leftX + panelW / 2, M + 18);
    g.fillStyle = `rgb(${meanGrey},${meanGrey},${meanGrey})`;
    g.fillRect(leftX, leftY, panelW, panelH);
    // Crystal density: more crystals at higher ISO (larger), proportionally more clumping
    const nCrystals = Math.floor((panelW * panelH) / Math.max(2, Math.pow(crystalSize * 1.8, 2)));
    for (let i = 0; i < nCrystals; i++) {
      const x = leftX + Math.random() * panelW;
      const y = leftY + Math.random() * panelH;
      const r = crystalSize * (0.5 + Math.random() * 1.5); // size variation
      // crystals are darker than the base (developed silver)
      const dark = Math.round(meanGrey - 35 - Math.random() * 30);
      g.fillStyle = `rgba(${dark},${dark},${dark},${0.55 + Math.random() * 0.35})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
    g.strokeRect(leftX, leftY, panelW, panelH);

    // Right panel — digital noise
    const rightX = M * 2 + panelW, rightY = leftY;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'center';
    g.fillText(`Digital noise (per-pixel Gaussian) — ISO ${this.iso}`, rightX + panelW / 2, M + 18);

    // Pixel-level rendering via ImageData (fast + truly grid-aligned)
    const img = g.createImageData(Math.floor(panelW), Math.floor(panelH));
    const dpr = window.devicePixelRatio || 1;
    void dpr; // ImageData uses logical pixels via context scaling, but createImageData here is logical resolution
    for (let i = 0; i < img.data.length; i += 4) {
      // Box-Muller Gaussian
      const u1 = Math.random() || 1e-9, u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const v = Math.max(0, Math.min(255, meanGrey + z * noiseSigma));
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, rightX, rightY);
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
    g.strokeRect(rightX, rightY, panelW, panelH);

    // Stats readout
    const ny = leftY + panelH + 18;
    g.fillStyle = theme.inkAlpha(0.75); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText(`crystal size ~ ${crystalSize.toFixed(2)} px, density ${nCrystals.toLocaleString()} grains`, leftX, ny);
    g.fillText(`σ ≈ ${noiseSigma.toFixed(1)} (Gaussian, independent per pixel)`, rightX, ny);

    // Annotation
    const cy = ny + 22;
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Film grain is clumped and irregular (silver crystals develop where the latent image was). Crystals are large enough to scatter across multiple pixels — the texture survives downsampling.', M, cy);
    g.fillText('Digital noise is grid-aligned and independent per pixel — averaging adjacent pixels reduces it cleanly (the basis of multi-frame averaging).', M, cy + 18);
  }
}

new GrainNoise();
