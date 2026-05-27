import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { applyCVD, cycleCVD, CVDType } from '@core/math/color-science';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

interface SwatchPair {
  label: string;
  a: { r: number; g: number; b: number };
  b: { r: number; g: number; b: number };
}

// Pairs chosen to demonstrate well-known CVD confusions.
const PAIRS: SwatchPair[] = [
  { label: 'Red vs Green',     a: { r: 0.78, g: 0.18, b: 0.20 }, b: { r: 0.20, g: 0.62, b: 0.22 } },
  { label: 'Orange vs Yellow', a: { r: 0.92, g: 0.52, b: 0.10 }, b: { r: 0.95, g: 0.80, b: 0.15 } },
  { label: 'Pink vs Gray',     a: { r: 0.88, g: 0.55, b: 0.65 }, b: { r: 0.70, g: 0.62, b: 0.62 } },
  { label: 'Blue vs Violet',   a: { r: 0.20, g: 0.32, b: 0.78 }, b: { r: 0.55, g: 0.22, b: 0.80 } },
  { label: 'Brown vs Olive',   a: { r: 0.55, g: 0.35, b: 0.15 }, b: { r: 0.55, g: 0.55, b: 0.15 } },
  { label: 'Cyan vs Lime',     a: { r: 0.15, g: 0.78, b: 0.78 }, b: { r: 0.55, g: 0.85, b: 0.18 } },
];

class CVDEveryday {
  private stage: CanvasStage;
  private mode: CVDType = 'normal';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());

    const fromUrl = hydrateFromUrl('mode') as CVDType | null;
    if (fromUrl && ['normal','protanopia','deuteranopia','tritanopia'].includes(fromUrl)) {
      this.mode = fromUrl;
    }
    const toggle = document.getElementById('mode') as EncToggle;
    toggle.value = this.mode;

    registerStateParam('mode', () => (this.mode === 'normal' ? undefined : this.mode));

    toggle.addEventListener('change', (e: Event) => {
      this.mode = (e as CustomEvent).detail.value as CVDType;
      this.draw();
      notifyStateChange();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        this.mode = cycleCVD(this.mode);
        toggle.value = this.mode;
        this.draw();
        notifyStateChange();
      }
    });

    document.addEventListener('reset-params', () => {
      this.mode = 'normal';
      toggle.value = 'normal';
      this.draw();
      notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, w, h);

    const padX = 36; const padY = 44; const gap = 14;
    const cellW = (w - padX * 2 - gap) / 2;
    const cellH = Math.max(60, (h - padY - 24 - gap * (PAIRS.length - 1)) / PAIRS.length);

    PAIRS.forEach((pair, i) => {
      const y = padY + i * (cellH + gap);
      const aTrans = applyCVD(pair.a, this.mode);
      const bTrans = applyCVD(pair.b, this.mode);

      this.swatch(ctx, padX, y, cellW, cellH, aTrans);
      this.swatch(ctx, padX + cellW + gap, y, cellW, cellH, bTrans);

      // Label — italic serif gold
      ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
      ctx.fillStyle = theme.goldDeep;
      ctx.fillText(pair.label, padX, y - 6);
    });

    // Mode caption — top-left
    ctx.font = '500 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = theme.ink;
    ctx.fillText(`Mode · ${this.modeLabel(this.mode)}`, padX, padY - 22);
  }

  private modeLabel(m: CVDType): string {
    switch (m) {
      case 'normal':       return 'Normal trichromat';
      case 'protanopia':   return 'Protanope (no L cones)';
      case 'deuteranopia': return 'Deuteranope (no M cones)';
      case 'tritanopia':   return 'Tritanope (no S cones)';
    }
  }

  private swatch(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    rgb: { r: number; g: number; b: number },
  ) {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = theme.inkAlpha(0.18);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

window.addEventListener('DOMContentLoaded', () => new CVDEveryday());
