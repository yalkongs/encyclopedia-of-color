import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { catAdapt, CAT_MATRICES, xyzFromLinearSrgb, srgbCss } from '@core/math/color-adaptation';
import { Lab, xyzToLab, deltaE2000 } from '@core/math/colorimetry';
import { srgbToLinear } from '@core/math/oklab';
import { D65, D50, A, type WhitePoint } from '@core/math/illuminants';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

type V3 = [number, number, number];
const WP: Record<string, WhitePoint> = { d65: D65, d50: D50, a: A };
const CATS: Array<[string, string]> = [['bradford', 'Bradford'], ['cat02', 'CAT02'], ['sharp', 'Sharp'], ['vonKries', 'Von Kries']];

function hueRgb(h: number): V3 {
  const x = 1 - Math.abs(((h / 60) % 2) - 1);
  const seg = Math.floor(h / 60) % 6;
  return [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][seg] as V3;
}

class CatComparison {
  private stage: CanvasStage;
  private hue = 40; private src = 'd65'; private dst = 'a';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 40); this.src = hydrateFromUrl('src') ?? 'd65'; this.dst = hydrateFromUrl('dst') ?? 'a';
    const hs = document.getElementById('hue') as EncSlider;
    hs.value = this.hue;
    hs.addEventListener('input', (e) => { this.hue = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('hue', () => Math.round(this.hue));
    const st = document.getElementById('src') as EncToggle, dt = document.getElementById('dst') as EncToggle;
    st.value = this.src; dt.value = this.dst;
    st.addEventListener('change', (e) => { this.src = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    dt.addEventListener('change', (e) => { this.dst = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('src', () => this.src); registerStateParam('dst', () => this.dst);
    document.addEventListener('reset-params', () => {
      this.hue = 40; this.src = 'd65'; this.dst = 'a'; hs.value = 40; st.value = 'd65'; dt.value = 'a'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const srcW = WP[this.src], dstW = WP[this.dst];
    const lin = hueRgb(this.hue).map((c) => srgbToLinear(c)) as V3; // treat as already-linear hue
    const xyz = xyzFromLinearSrgb(lin);

    const results = CATS.map(([key, name]) => {
      const adapted = catAdapt(xyz, srcW, dstW, CAT_MATRICES[key]);
      return { name, xyz: adapted, lab: xyzToLab(adapted) as Lab };
    });
    const refLab = results[0].lab;

    // source swatch
    ctx.fillStyle = srgbCss(lin); ctx.fillRect(28, 30, 90, 60); ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(28, 30, 90, 60);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`source under ${this.src.toUpperCase()}`, 28, 104);
    ctx.fillStyle = theme.inkHint; ctx.font = '22px "Cormorant Garamond", Georgia, serif'; ctx.fillText('→', 132, 66);

    // 4 adapted patches
    const pw = Math.min(120, (w - 180) / 4 - 14), gap = 16, x0 = 160;
    results.forEach((r, i) => {
      const x = x0 + i * (pw + gap), y = 30;
      ctx.fillStyle = srgbCss(r.xyz); ctx.fillRect(x, y, pw, 60);
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x, y, pw, 60);
      ctx.fillStyle = theme.inkSoft; ctx.font = '600 12px Inter, sans-serif'; ctx.fillText(r.name, x, y + 76);
      const dE = i === 0 ? 0 : deltaE2000(refLab, r.lab);
      ctx.fillStyle = i === 0 ? theme.goldDeep : (dE > 1 ? theme.crimson : theme.inkMute);
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(i === 0 ? 'reference' : `ΔE₀₀ ${dE.toFixed(2)} vs Bradford`, x, y + 90);
    });

    // chroma/hue bars comparison (a*b* offset from reference)
    const by = 150, barH = (h - by - 40);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('adapted a*b* (each CAT, relative to neutral)', 28, by);
    const cx = w * 0.5, cy = by + barH * 0.55, scale = Math.min(barH * 0.4, w * 0.18) / 60;
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 200, cy); ctx.lineTo(cx + 200, cy); ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80); ctx.stroke();
    const colors = [theme.goldDeep, theme.crimson, theme.slate, theme.ink];
    results.forEach((r, i) => {
      ctx.beginPath(); ctx.arc(cx + r.lab[1] * scale, cy - r.lab[2] * scale, 6, 0, Math.PI * 2);
      ctx.fillStyle = srgbCss(r.xyz); ctx.fill(); ctx.strokeStyle = colors[i]; ctx.lineWidth = 2; ctx.stroke();
    });

    const maxDE = Math.max(...results.slice(1).map((r) => deltaE2000(refLab, r.lab)));
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`${this.src.toUpperCase()} → ${this.dst.toUpperCase()}: CATs spread up to ΔE₀₀ ${maxDE.toFixed(2)} — larger white shifts widen the gap`, 28, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new CatComparison());
