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
import { SRGB, DISPLAY_P3, BT2020, type RgbSpace } from '@core/math/rgb-spaces';

const X1 = 0.75, Y1 = 0.85;
const SPACES: Record<string, RgbSpace> = { srgb: SRGB, p3: DISPLAY_P3, rec2020: BT2020 };
const SDR_WHITE = 203;

class HDRWeb {
  private stage: CanvasStage;
  private space = 'p3';
  private headroom = 2;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.space = hydrateFromUrl('space') ?? 'p3';
    this.headroom = hydrateNumber('headroom', 2);
    const t = document.getElementById('space') as EncToggle;
    t.value = this.space;
    t.addEventListener('change', (e) => { this.space = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('space', () => this.space);
    const s = document.getElementById('headroom') as EncSlider;
    s.value = this.headroom;
    s.addEventListener('input', (e) => { this.headroom = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('headroom', () => this.headroom.toFixed(1));
    document.addEventListener('reset-params', () => { this.space = 'p3'; this.headroom = 2; t.value = 'p3'; s.value = 2; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 56, gy = 30, gw = Math.min(w - 340, h * 0.92), gh = h - 96;
    const X = (x: number) => gx + (x / X1) * gw;
    const Y = (y: number) => gy + gh - (y / Y1) * gh;

    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    const tri = (s: RgbSpace, stroke: string, lw: number, fill: string | null) => {
      const p = s.primaries;
      ctx.beginPath(); ctx.moveTo(X(p.r[0]), Y(p.r[1])); ctx.lineTo(X(p.g[0]), Y(p.g[1])); ctx.lineTo(X(p.b[0]), Y(p.b[1])); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
    };
    const sel = SPACES[this.space];
    tri(BT2020, theme.inkAlpha(this.space === 'rec2020' ? 0.6 : 0.25), this.space === 'rec2020' ? 2.4 : 1, this.space === 'rec2020' ? 'rgba(176,57,47,0.10)' : null);
    tri(DISPLAY_P3, theme.inkAlpha(this.space === 'p3' ? 0.6 : 0.25), this.space === 'p3' ? 2.4 : 1, this.space === 'p3' ? 'rgba(176,140,40,0.12)' : null);
    tri(SRGB, theme.inkAlpha(this.space === 'srgb' ? 0.6 : 0.25), this.space === 'srgb' ? 2.4 : 1, this.space === 'srgb' ? 'rgba(80,110,140,0.14)' : null);
    void sel;
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CIE x', gx + gw / 2, gy + gh + 26);
    ctx.save(); ctx.translate(gx - 38, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('CIE y', 0, 0); ctx.restore();

    // headroom bar (right)
    const bx = gx + gw + 60, bw = 90, bTop = gy + 10, bBot = gy + gh - 10;
    const peak = SDR_WHITE * Math.pow(2, this.headroom);
    const maxNits = SDR_WHITE * 16; // axis top = 4 stops over... use log
    const yN = (nits: number) => bBot - (Math.log2(Math.max(1, nits) / 1) / Math.log2(maxNits)) * (bBot - bTop);
    // SDR region
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(bx, yN(SDR_WHITE), bw, bBot - yN(SDR_WHITE));
    // HDR headroom region
    const grd = ctx.createLinearGradient(0, yN(peak), 0, yN(SDR_WHITE));
    grd.addColorStop(0, '#fff7e0'); grd.addColorStop(1, theme.gold);
    ctx.fillStyle = grd; ctx.fillRect(bx, yN(peak), bw, yN(SDR_WHITE) - yN(peak));
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(bx, bTop, bw, bBot - bTop);
    ctx.strokeStyle = theme.slate; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(bx, yN(SDR_WHITE)); ctx.lineTo(bx + bw, yN(SDR_WHITE)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`SDR white ${SDR_WHITE} nits`, bx + bw + 8, yN(SDR_WHITE) + 4);
    ctx.fillText(`HDR peak ${Math.round(peak)} nits`, bx + bw + 8, yN(peak) + 4);
    ctx.fillStyle = theme.inkSoft; ctx.fillText('brightness', bx, bTop - 8);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`color(${this.space} …) widens the gamut; +${this.headroom.toFixed(1)} stops of headroom lets highlights reach ${Math.round(peak)} nits`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new HDRWeb());
