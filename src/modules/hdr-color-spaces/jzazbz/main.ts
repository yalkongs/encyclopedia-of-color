import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { xyzToLab } from '@core/math/colorimetry';
import { xyzToJzazbz } from '@core/math/hdr-spaces';
import { D65 } from '@core/math/illuminants';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Neutral grey at luminance L cd/m² (Y in absolute units; white = 10000 cd/m²).
function greyLab(L: number): number {
  const f = L / 10000;
  return xyzToLab([D65.X * f, f, D65.Z * f])[0] / 100;
}
function greyJz(L: number): number {
  return xyzToJzazbz([D65.X * L, L, D65.Z * L])[0];
}
const JZ_MAX = greyJz(10000), L_MAX = greyLab(10000);

class JzazbzMod {
  private stage: CanvasStage;
  private lum = 600;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lum = hydrateNumber('lum', 600);
    const el = document.getElementById('lum') as EncSlider;
    el.value = this.lum;
    el.addEventListener('input', (e) => { this.lum = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lum', () => Math.round(this.lum));
    document.addEventListener('reset-params', () => { this.lum = 600; el.value = 600; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const x0 = 52, plotY = 30, plotW = w - x0 - 40, plotH = h - 96;
    const lx = (L: number) => x0 + (Math.log10(Math.max(L, 0.1)) - Math.log10(0.1)) / (Math.log10(10000) - Math.log10(0.1)) * plotW;
    const py = (v: number) => plotY + plotH - v * plotH;

    // grid
    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (const L of [0.1, 1, 10, 100, 1000, 10000]) { ctx.beginPath(); ctx.moveTo(lx(L), plotY); ctx.lineTo(lx(L), plotY + plotH); ctx.stroke(); }
    for (let g = 0; g <= 1.0001; g += 0.25) { ctx.beginPath(); ctx.moveTo(x0, py(g)); ctx.lineTo(x0 + plotW, py(g)); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, plotY); ctx.lineTo(x0, plotY + plotH); ctx.lineTo(x0 + plotW, plotY + plotH); ctx.stroke();
    ctx.fillStyle = axisStyle.label; ctx.font = '11px Inter, sans-serif';
    for (const L of [0.1, 1, 10, 100, 1000, 10000]) ctx.fillText(String(L), lx(L) - 8, plotY + plotH + 14);
    ctx.fillText('cd/m²', x0 + plotW - 32, plotY + plotH + 28);
    ctx.fillText('normalised lightness', x0 - 44, plotY - 10);

    const curve = (fn: (L: number) => number, max: number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const L = 0.1 * (10000 / 0.1) ** (i / 240);
        const v = Math.max(0, fn(L) / max);
        i === 0 ? ctx.moveTo(lx(L), py(v)) : ctx.lineTo(lx(L), py(v));
      }
      ctx.stroke();
    };
    curve(greyLab, L_MAX, theme.crimson);
    curve(greyJz, JZ_MAX, theme.slate);

    // marker
    const jz = greyJz(this.lum) / JZ_MAX, ls = Math.max(0, greyLab(this.lum) / L_MAX);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(lx(this.lum), plotY); ctx.lineTo(lx(this.lum), plotY + plotH); ctx.stroke(); ctx.setLineDash([]);
    for (const [v, c] of [[jz, theme.slate], [ls, theme.crimson]] as const) {
      ctx.beginPath(); ctx.arc(lx(this.lum), py(v), 5, 0, Math.PI * 2); ctx.fillStyle = c as string; ctx.fill();
    }

    // legend
    ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = theme.crimson; ctx.fillRect(x0 + 10, plotY + 6, 16, 3); ctx.fillStyle = theme.inkSoft; ctx.fillText('CIELAB L*', x0 + 32, plotY + 10);
    ctx.fillStyle = theme.slate; ctx.fillRect(x0 + 10, plotY + 24, 16, 3); ctx.fillStyle = theme.inkSoft; ctx.fillText('Jzazbz Jz', x0 + 32, plotY + 28);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`at ${this.lum} cd/m²:  L*/L*max = ${ls.toFixed(3)}   Jz/Jzmax = ${jz.toFixed(3)}`, x0, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new JzazbzMod());
