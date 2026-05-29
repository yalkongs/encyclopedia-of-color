import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme, axisStyle } from '@core/render/theme';
import { Lab, labToCss, deltaE76, deltaE2000Terms } from '@core/math/colorimetry';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const REF: Lab = [38, 16, -45];

class DeltaE00 {
  private stage: CanvasStage;
  private L = 42; private a = 8; private b = -38;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.L = hydrateNumber('L', 42); this.a = hydrateNumber('a', 8); this.b = hydrateNumber('b', -38);
    for (const k of ['L', 'a', 'b'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => {
      this.L = 42; this.a = 8; this.b = -38;
      (document.getElementById('L') as EncSlider).value = 42;
      (document.getElementById('a') as EncSlider).value = 8;
      (document.getElementById('b') as EncSlider).value = -38;
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const sample: Lab = [this.L, this.a, this.b];
    const t = deltaE2000Terms(REF, sample);
    const dE76 = deltaE76(REF, sample);

    // patches
    const pw = 76, ph = 54, py = 26;
    ctx.fillStyle = labToCss(REF); ctx.fillRect(24, py, pw, ph);
    ctx.fillStyle = labToCss(sample); ctx.fillRect(24 + pw + 12, py, pw, ph);
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1;
    ctx.strokeRect(24, py, pw, ph); ctx.strokeRect(24 + pw + 12, py, pw, ph);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('blue reference', 24, py + ph + 14); ctx.fillText('sample', 24 + pw + 12, py + ph + 14);

    // big readouts
    const rx = 24 + 2 * pw + 34;
    ctx.fillStyle = theme.inkMute; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(`ΔE₇₆ = ${dE76.toFixed(2)}`, rx, py + 18);
    ctx.fillStyle = theme.crimson; ctx.font = '700 30px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`ΔE₀₀ = ${t.dE.toFixed(2)}`, rx, py + 48);

    // term bars
    const labels = ['Tʟ  lightness', 'T꜀  chroma', 'Tʜ  hue', 'Rᴛ·T꜀Tʜ  rotation'];
    const vals = [t.tL, t.tC, t.tH, t.rot];
    const sq = [t.tL * t.tL, t.tC * t.tC, t.tH * t.tH, t.rot];
    const by = py + ph + 40;
    const maxMag = Math.max(0.5, ...sq.map(Math.abs));
    const barX = 170, barMax = w - barX - 90, rowH = Math.min(46, (h - by - 30) / 4);
    for (let i = 0; i < 4; i++) {
      const y = by + i * rowH;
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(labels[i], 24, y + rowH * 0.5 + 4);
      const len = (Math.abs(sq[i]) / maxMag) * barMax;
      const rotActive = i === 3 && Math.abs(t.RT) > 0.05;
      ctx.fillStyle = i === 3 ? (rotActive ? theme.crimson : theme.inkAlpha(0.25)) : theme.slate;
      ctx.fillRect(barX, y + 6, Math.max(2, len), rowH - 18);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${vals[i] >= 0 ? '+' : ''}${vals[i].toFixed(2)}`, barX + Math.max(2, len) + 6, y + rowH * 0.5 + 4);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = Math.abs(t.RT) > 0.05 ? theme.crimson : theme.goldDeep;
    ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(Math.abs(t.RT) > 0.05
      ? `rotation term active here — RT = ${t.RT.toFixed(2)} (the blue-region correction)`
      : `rotation term dormant — RT = ${t.RT.toFixed(2)} (only wakes near h ≈ 275°)`, 24, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new DeltaE00());
