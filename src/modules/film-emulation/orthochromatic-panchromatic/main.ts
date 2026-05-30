import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Era = 'blue' | 'ortho' | 'pan';
const ERAS: Era[] = ['blue', 'ortho', 'pan'];

// Approximate spectral sensitivity per era, sampled 400..700nm
// Blue (collodion/early gelatin): 350..500nm
// Ortho (after 1873 dye sensitization): 350..580nm
// Pan (after 1906): 350..680nm, slightly biased to red
function sensitivity(era: Era, lambda: number): number {
  if (era === 'blue') {
    return Math.exp(-Math.pow((lambda - 420) / 50, 2));
  }
  if (era === 'ortho') {
    return Math.exp(-Math.pow((lambda - 480) / 80, 2));
  }
  // pan: broadband
  return 0.85 * Math.exp(-Math.pow((lambda - 530) / 110, 2)) + 0.4 * Math.exp(-Math.pow((lambda - 640) / 60, 2));
}

// Patches: (sRGB 8-bit, dominant wavelength approx, label)
const PATCHES: { rgb: [number, number, number]; spd: (l: number) => number; label: string }[] = [
  { rgb: [200, 60, 50],  spd: (l) => Math.exp(-Math.pow((l - 620) / 40, 2)), label: 'red rose' },
  { rgb: [80, 180, 60],  spd: (l) => Math.exp(-Math.pow((l - 540) / 50, 2)), label: 'green leaf' },
  { rgb: [60, 100, 200], spd: (l) => Math.exp(-Math.pow((l - 460) / 40, 2)), label: 'blue sky' },
  { rgb: [220, 200, 60], spd: (l) => 0.6 * Math.exp(-Math.pow((l - 580) / 50, 2)) + 0.4 * Math.exp(-Math.pow((l - 540) / 40, 2)), label: 'yellow flower' },
  { rgb: [200, 200, 200],spd: () => 0.5, label: 'neutral grey' },
  { rgb: [120, 70, 130], spd: (l) => 0.5 * Math.exp(-Math.pow((l - 440) / 40, 2)) + 0.5 * Math.exp(-Math.pow((l - 660) / 40, 2)), label: 'magenta' },
];

// Integrate film response: sum over wavelength
function filmResponse(era: Era, spd: (l: number) => number): number {
  let acc = 0, norm = 0;
  for (let l = 400; l <= 700; l += 10) {
    const s = sensitivity(era, l);
    acc += s * spd(l);
    norm += s;
  }
  // Normalise so grey patch (constant 0.5 spd) → ~0.5 across all eras
  return acc / norm;
}

class FilmEra {
  private stage: CanvasStage;
  private era: Era = 'blue';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('era');
    if (raw && (ERAS as string[]).includes(raw)) this.era = raw as Era;
    const t = document.getElementById('era') as EncToggle;
    t.value = this.era;
    t.addEventListener('change', (e) => { this.era = (e as CustomEvent).detail.value as Era; this.draw(); notifyStateChange(); });
    registerStateParam('era', () => this.era);
    document.addEventListener('reset-params', () => { this.era = 'blue'; t.value = 'blue'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Top: sensitivity curve
    const px = M, py = M + 14;
    const pw = w - 2 * M, ph = 160;

    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`Film sensitivity — ${this.era === 'blue' ? 'Blue-only (pre-1873)' : this.era === 'ortho' ? 'Orthochromatic (1873+, Vogel)' : 'Panchromatic (1906+, red-extended)'}`, M, M + 4);

    // Axes
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    for (let l = 400; l <= 700; l += 50) {
      const X = px + ((l - 400) / 300) * pw;
      g.beginPath(); g.moveTo(X, py + ph); g.lineTo(X, py + ph + 4); g.stroke();
      g.fillText(`${l}`, X, py + ph + 16);
    }
    g.fillText('wavelength (nm)', px + pw / 2, py + ph + 32);

    // Visible spectrum strip overlay (faint)
    for (let l = 400; l <= 700; l += 5) {
      const X = px + ((l - 400) / 300) * pw;
      g.fillStyle = `hsla(${260 - (l - 400)},80%,50%,0.18)`;
      g.fillRect(X, py + ph - 14, (5 / 300) * pw + 1, 14);
    }

    // Sensitivity curve
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let l = 400; l <= 700; l += 2) {
      const X = px + ((l - 400) / 300) * pw;
      const s = sensitivity(this.era, l);
      const Y = py + ph - 14 - s * (ph - 30);
      if (l === 400) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();

    // Bottom: patches as colour vs B&W under this film
    const botY = py + ph + 60;
    const rowH = 64;
    const cw = (w - 2 * M) / PATCHES.length;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('original colour scene', M + (w - 2 * M) / 2, botY - 4);
    for (let i = 0; i < PATCHES.length; i++) {
      const [r, gn, b] = PATCHES[i].rgb;
      g.fillStyle = `rgb(${r},${gn},${b})`;
      g.fillRect(M + i * cw + 4, botY, cw - 8, rowH);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(M + i * cw + 4, botY, cw - 8, rowH);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(PATCHES[i].label, M + i * cw + cw / 2, botY + rowH + 14);
    }

    // B&W rendering
    const bw2Y = botY + rowH + 30;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText(`how this film renders the scene as grey`, M + (w - 2 * M) / 2, bw2Y - 4);
    for (let i = 0; i < PATCHES.length; i++) {
      const v = Math.min(1, Math.max(0, filmResponse(this.era, PATCHES[i].spd) * 1.4));
      const g8 = Math.round(v * 255);
      g.fillStyle = `rgb(${g8},${g8},${g8})`;
      g.fillRect(M + i * cw + 4, bw2Y, cw - 8, rowH);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(M + i * cw + 4, bw2Y, cw - 8, rowH);
      g.fillStyle = theme.inkAlpha(0.65); g.font = '10px monospace'; g.textAlign = 'center';
      g.fillText(`${(v * 100).toFixed(0)}%`, M + i * cw + cw / 2, bw2Y + rowH + 14);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.55); g.font = '11px serif'; g.textAlign = 'left';
    const note = this.era === 'blue' ? 'Reds and greens go nearly black — early portraits of the period look unnaturally pale on lips and dark on skies that had cloud detail.'
              : this.era === 'ortho' ? 'Reds still darken (lips, lipstick); skies lighten because blue+green sensitivity overlaps cloud-vs-sky luminance.'
              : 'Panchromatic film records all visible wavelengths — greys track perceived luminance, the visual standard used in cinema and modern B&W.';
    g.fillText(note, M, bw2Y + rowH + 36);
  }
}

new FilmEra();
