import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { DEG } from '@core/math/physics';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const SOURCE_AREA = 1e-4; // m² (1 cm² emitter, for luminance/nit)

class PhotometryGeometry {
  private stage: CanvasStage;
  private flux = 800; // lm
  private beam = 30;  // half-angle deg
  private dist = 2.0; // m

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.flux = hydrateNumber('flux', 800);
    this.beam = hydrateNumber('beam', 30);
    this.dist = hydrateNumber('dist', 2.0);
    (document.getElementById('flux') as EncSlider).value = this.flux;
    (document.getElementById('beam') as EncSlider).value = this.beam;
    (document.getElementById('dist') as EncSlider).value = this.dist;
    registerStateParam('flux', () => this.flux);
    registerStateParam('beam', () => this.beam);
    registerStateParam('dist', () => this.dist);
    for (const id of ['flux', 'beam', 'dist']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'flux') this.flux = v;
        else if (id === 'beam') this.beam = v;
        else this.dist = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.flux = 800; this.beam = 30; this.dist = 2.0;
      (document.getElementById('flux') as EncSlider).value = 800;
      (document.getElementById('beam') as EncSlider).value = 30;
      (document.getElementById('dist') as EncSlider).value = 2.0;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const theta = this.beam * DEG;
    const Omega = 2 * Math.PI * (1 - Math.cos(theta));  // sr
    const I = this.flux / Omega;                         // cd
    const E = I / (this.dist * this.dist);               // lux
    const L = I / SOURCE_AREA;                           // nit (cd/m²)

    // Geometry: source at left, cone to a wall at the right.
    const srcX = w * 0.12, cy = h * 0.42;
    const maxWallX = w * 0.72;
    const wallX = srcX + ((this.dist - 0.5) / (8 - 0.5)) * (maxWallX - srcX) + 60;
    const spotHalf = Math.max(6, Math.tan(theta) * (wallX - srcX) * 0.5);

    // Cone.
    ctx.fillStyle = 'rgba(255,210,120,0.12)';
    ctx.beginPath();
    ctx.moveTo(srcX, cy);
    ctx.lineTo(wallX, cy - spotHalf);
    ctx.lineTo(wallX, cy + spotHalf);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = theme.goldAlpha(0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(srcX, cy); ctx.lineTo(wallX, cy - spotHalf); ctx.moveTo(srcX, cy); ctx.lineTo(wallX, cy + spotHalf); ctx.stroke();

    // Source lamp.
    ctx.fillStyle = '#fff2c0';
    ctx.beginPath(); ctx.arc(srcX, cy, 9, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('lamp', srcX - 12, cy - 16);

    // Wall + illuminated patch (brightness ∝ lux, normalised).
    const Enorm = Math.min(1, E / 400);
    ctx.fillStyle = `rgb(${Math.round(255 * Enorm)},${Math.round(245 * Enorm)},${Math.round(200 * Enorm)})`;
    ctx.fillRect(wallX, cy - spotHalf, 14, 2 * spotHalf);
    ctx.strokeStyle = theme.inkAlpha(0.55); ctx.lineWidth = 1.4;
    ctx.strokeRect(wallX, cy - spotHalf, 14, 2 * spotHalf);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('wall', wallX + 18, cy);

    // Distance caliper.
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(srcX, cy + h * 0.18); ctx.lineTo(wallX, cy + h * 0.18); ctx.stroke();
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`d = ${this.dist.toFixed(1)} m`, (srcX + wallX) / 2 - 18, cy + h * 0.18 - 6);

    // Unit cards.
    const cards = [
      { label: 'Φ  luminous flux', val: `${this.flux} lm`, col: theme.ink },
      { label: 'Ω  solid angle', val: `${Omega.toFixed(3)} sr`, col: theme.inkMute },
      { label: 'I  intensity', val: `${I.toFixed(0)} cd`, col: theme.goldDeep },
      { label: 'E  illuminance', val: `${E.toFixed(0)} lx`, col: theme.crimson },
      { label: 'L  luminance', val: `${(L / 1000).toFixed(0)} knit`, col: theme.slate },
    ];
    const cardY = h * 0.70;
    cards.forEach((c, i) => {
      const x = w * 0.06 + i * (w * 0.18);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(c.label, x, cardY);
      ctx.fillStyle = c.col; ctx.font = 'italic 17px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(c.val, x, cardY + 22);
    });

    // Inverse-square note.
    ctx.fillStyle = theme.crimson; ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText(`E = I/d² — double the distance, quarter the lux`, w * 0.06, h * 0.88);
  }
}
window.addEventListener('DOMContentLoaded', () => new PhotometryGeometry());
