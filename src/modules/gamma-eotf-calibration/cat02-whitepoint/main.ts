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
import { CAT_MATRICES, xyzFromLinearSrgb, linearSrgbFromXyz, srgbCss } from '@core/math/color-adaptation';
import { D50, D65, type WhitePoint } from '@core/math/illuminants';

type V3 = [number, number, number];
type M3 = [V3, V3, V3];

const mul = (m: M3, v: V3): V3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
function inv3(m: M3): M3 {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

// CAT with a degree-of-adaptation factor D (CAT02 style), in cone space of matrix M
function adaptDegree(xyz: V3, sw: WhitePoint, dw: WhitePoint, M: M3, D: number): V3 {
  const cs = mul(M, [sw.X, sw.Y, sw.Z]);
  const cd = mul(M, [dw.X, dw.Y, dw.Z]);
  const cx = mul(M, xyz);
  const out: V3 = [
    cx[0] * ((1 - D) + D * cd[0] / cs[0]),
    cx[1] * ((1 - D) + D * cd[1] / cs[1]),
    cx[2] * ((1 - D) + D * cd[2] / cs[2]),
  ];
  return mul(inv3(M), out);
}

const PALETTE = [
  '#ffffff', '#c8c8c8', '#7d7d7d', '#3a3a3a', '#c0392b', '#e67e22',
  '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#d35400',
];

function hexToLinear(hex: string): V3 {
  const n = parseInt(hex.slice(1), 16);
  const dec = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return [dec((n >> 16) & 255), dec((n >> 8) & 255), dec(n & 255)];
}

class WhitePointAdapt {
  private stage: CanvasStage;
  private dir = 'd65to50';
  private method = 'cat02';
  private degree = 100;
  private srcXyz: V3[];

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.srcXyz = PALETTE.map((hex) => xyzFromLinearSrgb(hexToLinear(hex)));
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dir = hydrateFromUrl('dir') ?? 'd65to50';
    this.method = hydrateFromUrl('method') ?? 'cat02';
    this.degree = hydrateNumber('degree', 100);
    const td = document.getElementById('dir') as EncToggle;
    td.value = this.dir;
    td.addEventListener('change', (e) => { this.dir = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dir', () => this.dir);
    const tm = document.getElementById('method') as EncToggle;
    tm.value = this.method;
    tm.addEventListener('change', (e) => { this.method = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('method', () => this.method);
    const s = document.getElementById('degree') as EncSlider;
    s.value = this.degree;
    s.addEventListener('input', (e) => { this.degree = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('degree', () => Math.round(this.degree));
    document.addEventListener('reset-params', () => {
      this.dir = 'd65to50'; this.method = 'cat02'; this.degree = 100;
      td.value = 'd65to50'; tm.value = 'cat02'; s.value = 100; this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const sw = this.dir === 'd65to50' ? D65 : D50;
    const dw = this.dir === 'd65to50' ? D50 : D65;
    const M = CAT_MATRICES[this.method] as M3;
    const D = this.degree / 100;

    // adapted neutral (the white) — the visible tint
    const whiteXyz: V3 = [sw.X, sw.Y, sw.Z];
    const adaptedWhite = srgbCss(linearSrgbFromXyz(adaptDegree(whiteXyz, sw, dw, M, D)));
    ctx.fillStyle = adaptedWhite; ctx.fillRect(40, 40, w - 80, 54);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(40, 40, w - 80, 54);
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`neutral white, adapted ${this.dir === 'd65to50' ? 'D65 → D50' : 'D50 → D65'}`, 50, 70);

    // patch grid
    const cols = 6, rows = 2;
    const gx = 40, gy = 116, gw = w - 80, gh = h - 116 - 56;
    const pw = gw / cols, ph = gh / rows, pad = 6;
    this.srcXyz.forEach((xyz, idx) => {
      const adapted = adaptDegree(xyz, sw, dw, M, D);
      const css = srgbCss(linearSrgbFromXyz(adapted));
      const c = idx % cols, r = Math.floor(idx / cols);
      ctx.fillStyle = css;
      ctx.fillRect(gx + c * pw + pad, gy + r * ph + pad, pw - pad * 2, ph - pad * 2);
      ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(gx + c * pw + pad, gy + r * ph + pad, pw - pad * 2, ph - pad * 2);
    });

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const names: Record<string, string> = { cat02: 'CAT02', bradford: 'Bradford', vonKries: 'von Kries' };
    ctx.fillText(`${names[this.method]} at D = ${Math.round(this.degree)}% — ${D === 0 ? 'no shift' : this.dir === 'd65to50' ? 'colours warm toward D50' : 'colours cool toward D65'}`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new WhitePointAdapt());
