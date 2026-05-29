import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { SRGB, ADOBE_RGB, DISPLAY_P3, BT2020, mul3, type RgbSpace, type V3 } from '@core/math/rgb-spaces';
import { bradfordAdapt, srgbCss } from '@core/math/color-adaptation';
import { srgbInGamut } from '@core/math/colorimetry';
import { D50 } from '@core/math/illuminants';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const SRC: Record<string, RgbSpace> = { adobe: ADOBE_RGB, p3: DISPLAY_P3, bt2020: BT2020 };
const DST: Record<string, RgbSpace> = { srgb: SRGB, p3: DISPLAY_P3 };

function hueRgb(h: number): V3 {
  const x = 1 - Math.abs(((h / 60) % 2) - 1);
  const seg = Math.floor(h / 60) % 6;
  return [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][seg] as V3;
}

class IccChain {
  private stage: CanvasStage;
  private hue = 150; private src = 'adobe'; private dst = 'srgb';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.hue = hydrateNumber('hue', 150); this.src = hydrateFromUrl('src') ?? 'adobe'; this.dst = hydrateFromUrl('dst') ?? 'srgb';
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
      this.hue = 150; this.src = 'adobe'; this.dst = 'srgb';
      hs.value = 150; st.value = 'adobe'; dt.value = 'srgb'; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const sp = SRC[this.src], dp = DST[this.dst];
    const srcLin = hueRgb(this.hue);
    const xyz = mul3(sp.toXyz, srcLin);
    const pcs = bradfordAdapt(xyz, sp.white, D50);     // device → PCS (D50)
    const xyzOut = bradfordAdapt(pcs, D50, dp.white);  // PCS → destination white
    const dstLin = mul3(dp.fromXyz, xyzOut);
    const inG = srgbInGamut(dstLin);

    // The source colour is shown in sRGB approximation for display.
    const dispSrc = srgbCss(mul3(SRGB.fromXyz, xyz));
    const dispDst = srgbCss(dstLin);

    const cx = w * 0.5, boxW = 120, boxH = 70;
    const stages: Array<{ x: number; label: string; sub: string; swatch?: string; vals: V3 }> = [
      { x: 40, label: sp.name.split(' ')[0] + ' RGB', sub: 'source device', swatch: dispSrc, vals: srcLin },
      { x: cx - boxW / 2, label: 'XYZ → PCS', sub: 'D50 connection', vals: pcs },
      { x: w - 40 - boxW, label: dp.name.split(' ')[0] + ' RGB', sub: 'destination', swatch: dispDst, vals: dstLin },
    ];
    const y = 70;
    // arrows
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.5;
    for (let i = 0; i < stages.length - 1; i++) {
      const x1 = stages[i].x + boxW, x2 = stages[i + 1].x;
      ctx.beginPath(); ctx.moveTo(x1, y + boxH / 2); ctx.lineTo(x2 - 8, y + boxH / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - 8, y + boxH / 2 - 4); ctx.lineTo(x2, y + boxH / 2); ctx.lineTo(x2 - 8, y + boxH / 2 + 4); ctx.fillStyle = theme.inkAlpha(0.5); ctx.fill();
      ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 11px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'src profile + CAT' : 'CAT + dst profile', (x1 + x2) / 2, y - 6);
    }
    ctx.textAlign = 'left';
    for (const s of stages) {
      ctx.fillStyle = theme.paper; ctx.fillRect(s.x, y, boxW, boxH);
      ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(s.x, y, boxW, boxH);
      if (s.swatch) { ctx.fillStyle = s.swatch; ctx.fillRect(s.x + boxW - 26, y + 6, 20, 20); ctx.strokeRect(s.x + boxW - 26, y + 6, 20, 20); }
      ctx.fillStyle = theme.inkSoft; ctx.font = '600 12px Inter, sans-serif'; ctx.fillText(s.label, s.x + 8, y + 18);
      ctx.fillStyle = theme.inkHint; ctx.font = '10px Inter, sans-serif'; ctx.fillText(s.sub, s.x + 8, y + 32);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px ui-monospace, monospace';
      s.vals.forEach((v, i) => ctx.fillText(v.toFixed(3), s.x + 8, y + 48 + i * 12));
    }

    // big in/out swatches + verdict
    const sy = y + boxH + 40;
    ctx.fillStyle = dispSrc; ctx.fillRect(cx - 150, sy, 90, 70); ctx.strokeStyle = axisStyle.baseline; ctx.strokeRect(cx - 150, sy, 90, 70);
    ctx.fillStyle = dispDst; ctx.fillRect(cx + 60, sy, 90, 70); ctx.strokeRect(cx + 60, sy, 90, 70);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('as captured', cx - 105, sy + 84); ctx.fillText('as reproduced', cx + 105, sy + 84);
    ctx.fillStyle = theme.inkHint; ctx.font = '22px "Cormorant Garamond", Georgia, serif'; ctx.fillText('→', cx, sy + 42);

    ctx.textAlign = 'left';
    ctx.fillStyle = inG ? theme.goldDeep : theme.crimson;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(inG
      ? `reproducible — the destination ${dp.name.split(' ')[0]} gamut contains this colour`
      : `out of ${dp.name.split(' ')[0]} gamut — the relative-colorimetric path clips it on output`, 40, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new IccChain());
