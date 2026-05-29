import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { ciecam02, ciecam16, SURROUND_AVERAGE, SURROUND_DIM, SURROUND_DARK, type Surround, type CAM02 } from '@core/math/cam';
import { SRGB, mul3, type V3 } from '@core/math/rgb-spaces';
import { srgbToLinear } from '@core/math/oklab';
import { srgbCss } from '@core/math/color-adaptation';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const SUR: Record<string, Surround> = { average: SURROUND_AVERAGE, dim: SURROUND_DIM, dark: SURROUND_DARK };
const XYZ_W: V3 = [95.05, 100, 108.88];
function hueRgb(h: number): V3 {
  const x = 1 - Math.abs(((h / 60) % 2) - 1);
  const seg = Math.floor(h / 60) % 6;
  return [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][seg] as V3;
}

class Ciecam16Mod {
  private stage: CanvasStage;
  private hue = 30; private la = 80; private sur = 'average';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 30); this.la = hydrateNumber('la', 80); this.sur = hydrateFromUrl('sur') ?? 'average';
    for (const k of ['hue', 'la'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    const st = document.getElementById('sur') as EncToggle;
    st.value = this.sur;
    st.addEventListener('change', (e) => { this.sur = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sur', () => this.sur);
    document.addEventListener('reset-params', () => {
      this.hue = 30; this.la = 80; this.sur = 'average';
      (document.getElementById('hue') as EncSlider).value = 30;
      (document.getElementById('la') as EncSlider).value = 80;
      st.value = 'average'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gamma = hueRgb(this.hue);
    const lin = gamma.map(srgbToLinear) as V3;
    const xyz = mul3(SRGB.toXyz, lin).map((c) => c * 100) as V3;
    const cam16 = ciecam16(xyz, XYZ_W, this.la, 20, SUR[this.sur]);
    const cam02 = ciecam02(xyz, XYZ_W, this.la, 20, SUR[this.sur]);

    // JCh dial
    const dialR = Math.min(h * 0.34, w * 0.24);
    const cx = 40 + dialR, cy = 40 + dialR;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (const cr of [0.33, 0.66, 1]) { ctx.beginPath(); ctx.arc(cx, cy, dialR * cr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline;
    ctx.beginPath(); ctx.moveTo(cx - dialR, cy); ctx.lineTo(cx + dialR, cy); ctx.moveTo(cx, cy - dialR); ctx.lineTo(cx, cy + dialR); ctx.stroke();
    const Cmax = 80, cScale = dialR / Cmax;
    const plot = (c: CAM02, r: number, fill: string, stroke: string) => {
      const ang = -c.h * Math.PI / 180;
      const px = cx + Math.min(c.C, Cmax) * cScale * Math.cos(ang), py = cy + Math.min(c.C, Cmax) * cScale * Math.sin(ang);
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    };
    plot(cam02, 5, theme.inkAlpha(0.12), theme.inkAlpha(0.45));
    plot(cam16, 7, srgbCss(lin), theme.ink);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('h / C dial', cx, cy + dialR + 16);
    ctx.fillText('faint = CIECAM02', cx, cy + dialR + 30);

    // bars (CIECAM16)
    const bx = 2 * dialR + 110, barW = w - bx - 70;
    const rows: Array<[string, number, number]> = [
      ['J  lightness', cam16.J, 100], ['Q  brightness', cam16.Q, 260], ['C  chroma', cam16.C, 90],
      ['M  colourfulness', cam16.M, 90], ['s  saturation', cam16.s, 100],
    ];
    const top = 44, rowH = Math.min(46, (h - top - 60) / rows.length);
    rows.forEach(([label, val, max], i) => {
      const y = top + i * rowH;
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, bx, y + rowH * 0.5);
      ctx.fillStyle = theme.goldAlpha(0.2); ctx.fillRect(bx + 130, y, barW - 130, rowH - 14);
      ctx.fillStyle = theme.slate; ctx.fillRect(bx + 130, y, Math.min(1, val / max) * (barW - 130), rowH - 14);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText(val.toFixed(1), bx + 130 + Math.min(1, val / max) * (barW - 130) + 6, y + rowH * 0.5);
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(`CIECAM16 vs CIECAM02:  ΔJ ${(cam16.J - cam02.J).toFixed(2)} · ΔC ${(cam16.C - cam02.C).toFixed(2)} · Δh ${(cam16.h - cam02.h).toFixed(1)}°`, 40, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Ciecam16Mod());
