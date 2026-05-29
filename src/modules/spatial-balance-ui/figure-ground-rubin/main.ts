import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

// Half-width of the vase as a fraction of max, top→bottom. The inward-facing edge
// reads as a face profile: forehead, brow dip, nose, lip, chin.
const PROFILE = [0.30, 0.34, 0.40, 0.30, 0.50, 0.58, 0.42, 0.40, 0.62, 0.66, 0.52, 0.46, 0.40, 0.34];
const grey = (L: number) => { const v = Math.round(255 * Math.pow(L / 100, 1 / 2.2)); return `rgb(${v},${v},${v})`; };

class RubinVase {
  private stage: CanvasStage;
  private cL = 18; private swap = 'vase';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.cL = hydrateNumber('cL', 18); this.swap = hydrateFromUrl('swap') ?? 'vase';
    const s = document.getElementById('cL') as EncSlider;
    s.value = this.cL;
    s.addEventListener('input', (e) => { this.cL = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('cL', () => Math.round(this.cL));
    const t = document.getElementById('swap') as EncToggle;
    t.value = this.swap;
    t.addEventListener('change', (e) => { this.swap = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('swap', () => this.swap);
    document.addEventListener('reset-params', () => { this.cL = 18; this.swap = 'vase'; s.value = 18; t.value = 'vase'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const centreL = this.cL, surroundL = 82;
    const vaseColor = this.swap === 'vase' ? grey(centreL) : grey(surroundL);
    const groundColor = this.swap === 'vase' ? grey(surroundL) : grey(centreL);

    ctx.fillStyle = groundColor; ctx.fillRect(0, 0, w, h);

    // vase region: centred column, half-width = PROFILE(y)·maxHW
    const cx = w / 2, top = 36, bot = h - 60, maxHW = Math.min(w * 0.26, (bot - top) * 0.42);
    const widthAt = (yFrac: number) => {
      const t = yFrac * (PROFILE.length - 1);
      const i = Math.floor(t), f = t - i;
      const a = PROFILE[Math.min(i, PROFILE.length - 1)], b = PROFILE[Math.min(i + 1, PROFILE.length - 1)];
      return (a + (b - a) * f) * maxHW;
    };
    ctx.fillStyle = vaseColor;
    ctx.beginPath();
    const N = 80;
    for (let i = 0; i <= N; i++) { const yf = i / N, y = top + yf * (bot - top); const x = cx - widthAt(yf); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    for (let i = N; i >= 0; i--) { const yf = i / N, y = top + yf * (bot - top); const x = cx + widthAt(yf); ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fill();
    // vase foot and rim (flat caps)
    ctx.fillRect(cx - maxHW * 0.5, top, maxHW, 8);
    ctx.fillRect(cx - maxHW * 0.55, bot - 8, maxHW * 1.1, 10);

    const diff = Math.abs(centreL - surroundL);
    ctx.fillStyle = diff < 18 ? theme.crimson : theme.goldDeep;
    ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(diff < 18
      ? 'equal lightness — strongly bistable, the vase and faces trade places'
      : 'a clear lightness difference fixes the figure; lower it for the flip', w / 2, h - 22);
  }
}
window.addEventListener('DOMContentLoaded', () => new RubinVase());
