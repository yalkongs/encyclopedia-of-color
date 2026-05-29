import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { thinFilmReflectance, spectralToXYZ, xyzToSrgb, rgbToCssHex, CMF_1931_2DEG, WAVELENGTH_STEP } from '@core/math/color-science';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const FILM_N = 1.5;
const Yref = CMF_1931_2DEG.reduce((s, r) => s + r.yBar, 0) * WAVELENGTH_STEP;

function reflectedColor(d: number, angleRad: number): string {
  const xyz = spectralToXYZ((lambda: number) => thinFilmReflectance(lambda, d, FILM_N, angleRad));
  const rgb = xyzToSrgb({ X: xyz.X / Yref, Y: xyz.Y / Yref, Z: xyz.Z / Yref });
  const m = Math.max(rgb.r, rgb.g, rgb.b);
  if (m > 0) { rgb.r = Math.min(1, rgb.r / m); rgb.g = Math.min(1, rgb.g / m); rgb.b = Math.min(1, rgb.b / m); }
  return rgbToCssHex(rgb);
}

class BraggOVI {
  private stage: CanvasStage;
  private tilt = 0;
  private thick = 265;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tilt = hydrateNumber('tilt', 0);
    this.thick = hydrateNumber('thick', 265);
    const st = document.getElementById('tilt') as EncSlider;
    st.value = this.tilt;
    st.addEventListener('input', (e) => { this.tilt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tilt', () => Math.round(this.tilt));
    const sk = document.getElementById('thick') as EncSlider;
    sk.value = this.thick;
    sk.addEventListener('input', (e) => { this.thick = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('thick', () => Math.round(this.thick));
    document.addEventListener('reset-params', () => { this.tilt = 0; this.thick = 265; st.value = 0; sk.value = 265; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#1d1b17'; ctx.fillRect(0, 0, w, h);
    const ang = (this.tilt * Math.PI) / 180;
    const col = reflectedColor(this.thick, ang);

    // banknote security patch (tilted to suggest 3D)
    const px = 60, py = 56, pw = Math.min(w * 0.4, 340), ph = pw * 0.62;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.transform(1, 0, -Math.sin(ang) * 0.5, Math.cos(ang) * 0.4 + 0.6, 0, 0);
    ctx.fillStyle = col; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    // denomination numeral cut from the patch
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.font = `700 ${ph * 0.6}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('50', 0, 0);
    ctx.restore();
    ctx.fillStyle = theme.paperBg; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('optically variable ink patch', px, py - 12);

    // reflectance spectrum
    const gx = 60, gy = py + ph + 64, gw = w - 120, gh = h - gy - 56;
    const X = (l: number) => gx + ((l - 400) / 300) * gw, Y = (r: number) => gy + gh - r * gh;
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 400; l <= 700; l += 50) { ctx.beginPath(); ctx.moveTo(X(l), gy); ctx.lineTo(X(l), gy + gh); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath();
    let peakL = 400, peakR = -1;
    for (let l = 400; l <= 700; l += 2) { const r = thinFilmReflectance(l, this.thick, FILM_N, ang); if (r > peakR) { peakR = r; peakL = l; } const x = X(l), y = Y(r); l === 400 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(peakL), gy); ctx.lineTo(X(peakL), gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 400; l <= 700; l += 50) ctx.fillText(`${l}`, X(l), gy + gh + 15);
    ctx.fillText('wavelength (nm)', gx + gw / 2, gy + gh + 30);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`tilt ${Math.round(this.tilt)}° — reflected peak at ${Math.round(peakL)} nm; tilting drives the peak toward blue`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new BraggOVI());
