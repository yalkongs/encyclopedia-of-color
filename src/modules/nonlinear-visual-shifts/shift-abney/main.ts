import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { SPECTRAL_LOCUS, xyToCss } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const XMAX = 0.74, YMAX = 0.84;
const WHITE: [number, number] = [1 / 3, 1 / 3];

/** Spectral-locus chromaticity at wavelength λ (CMF rows are 380..780 nm step 5). */
function locusAt(lam: number): [number, number] {
  const f = (lam - 380) / 5;
  const i = Math.max(0, Math.min(SPECTRAL_LOCUS.length - 2, Math.floor(f)));
  const t = f - i;
  const a = SPECTRAL_LOCUS[i], b = SPECTRAL_LOCUS[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

class ShiftAbney {
  private stage: CanvasStage;
  private lambda = 490; private purity = 70;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lambda = hydrateNumber('lambda', 490); this.purity = hydrateNumber('purity', 70);
    for (const id of ['lambda', 'purity'] as const) {
      (document.getElementById(id) as EncSlider).value = this[id];
      registerStateParam(id, () => this[id]);
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.lambda = 490; this.purity = 70;
      (document.getElementById('lambda') as EncSlider).value = 490;
      (document.getElementById('purity') as EncSlider).value = 70;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const pad = 44;
    const plotX = pad, plotY = 22, plotW = w * 0.6, plotH = h - 70;
    const s = Math.min(plotW / XMAX, plotH / YMAX);
    const px = (x: number) => plotX + x * s, py = (y: number) => plotY + plotH - y * s;

    // Axes + locus.
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX, plotY); ctx.moveTo(plotX, py(0)); ctx.lineTo(plotX + XMAX * s, py(0)); ctx.stroke();
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.2;
    ctx.beginPath(); SPECTRAL_LOCUS.forEach(([x, y], i) => { const X = px(x), Y = py(y); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }); ctx.closePath(); ctx.stroke();

    const sp = locusAt(this.lambda);
    // White point.
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(px(WHITE[0]), py(WHITE[1]), 3, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.fillText('white', px(WHITE[0]) + 5, py(WHITE[1]) - 4);

    // Straight constant-dominant-wavelength line (white → spectral).
    ctx.strokeStyle = theme.slate; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(px(WHITE[0]), py(WHITE[1])); ctx.lineTo(px(sp[0]), py(sp[1])); ctx.stroke();

    // Curved constant-perceived-hue line (schematic Abney bow).
    const perp = [-(sp[1] - WHITE[1]), sp[0] - WHITE[0]];
    const plen = Math.hypot(perp[0], perp[1]) || 1;
    const bow = 0.045;
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.05) {
      const bx = WHITE[0] + (sp[0] - WHITE[0]) * t + (perp[0] / plen) * bow * Math.sin(Math.PI * t);
      const by = WHITE[1] + (sp[1] - WHITE[1]) * t + (perp[1] / plen) * bow * Math.sin(Math.PI * t);
      t === 0 ? ctx.moveTo(px(bx), py(by)) : ctx.lineTo(px(bx), py(by));
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Marker at current purity along the straight line.
    const t = this.purity / 100;
    const mx = WHITE[0] + (sp[0] - WHITE[0]) * t, my = WHITE[1] + (sp[1] - WHITE[1]) * t;
    ctx.fillStyle = theme.ink; ctx.beginPath(); ctx.arc(px(mx), py(my), 5, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.paper; ctx.lineWidth = 1.2; ctx.stroke();

    // Legend.
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.slate; ctx.fillText('— constant dominant wavelength', plotX, h - 30);
    ctx.fillStyle = theme.crimson; ctx.fillText('— constant perceived hue (Abney)', plotX, h - 14);

    // Swatch.
    const swX = w * 0.74, swY = h * 0.3, sw = w * 0.18;
    ctx.fillStyle = xyToCss(mx, my); ctx.fillRect(swX, swY, sw, sw);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.strokeRect(swX, swY, sw, sw);
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`λ_d ${this.lambda} nm · purity ${this.purity}%`, swX + sw / 2, swY + sw + 22);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new ShiftAbney());
