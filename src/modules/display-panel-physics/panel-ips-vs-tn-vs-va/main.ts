import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

class PanelAngles {
  private stage: CanvasStage;
  private ang = 55; private panel = 'tn';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ang = hydrateNumber('ang', 55); this.panel = hydrateFromUrl('panel') ?? 'tn';
    const s = document.getElementById('ang') as EncSlider;
    s.value = this.ang;
    s.addEventListener('input', (e) => { this.ang = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ang', () => Math.round(this.ang));
    const t = document.getElementById('panel') as EncToggle;
    t.value = this.panel;
    t.addEventListener('change', (e) => { this.panel = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('panel', () => this.panel);
    document.addEventListener('reset-params', () => { this.ang = 55; this.panel = 'tn'; s.value = 55; t.value = 'tn'; this.draw(); notifyStateChange(); });
  }

  // degrade an sRGB (0..255) triple per panel + angle
  private shift(rgb: [number, number, number]): [number, number, number] {
    const a = this.ang / 80; // 0..1
    let [r, g, b] = rgb;
    if (this.panel === 'ips') { const k = 1 - 0.12 * a * a; r *= k; g *= k; b *= k; b += 18 * a; }
    else if (this.panel === 'va') { const lift = 60 * a * a; r = r * (1 - 0.25 * a) + lift; g = g * (1 - 0.25 * a) + lift; b = b * (1 - 0.2 * a) + lift; }
    else { // TN: colour cast + lightness inversion past ~0.6
        const inv = a > 0.6 ? (a - 0.6) / 0.4 : 0;
        r = r * (1 - 0.35 * a) + 40 * a; g = g * (1 - 0.25 * a) + 30 * a; b = b * (1 - 0.5 * a) + 70 * a;
        r = r + (255 - 2 * r) * inv * 0.6; g = g + (255 - 2 * g) * inv * 0.4; b = b + (255 - 2 * b) * inv * 0.5;
    }
    return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const patches: Array<[number, number, number]> = [[20, 20, 24], [80, 80, 88], [160, 160, 168], [230, 230, 235], [200, 60, 60], [60, 150, 200], [70, 170, 90], [220, 200, 60]];
    const x0 = 30, y0 = 50, pw = (w - 60) / patches.length, ph = h - 130;
    patches.forEach((p, i) => {
      // straight-on (top half), off-axis (bottom half)
      ctx.fillStyle = `rgb(${p.map((v) => v | 0).join(',')})`; ctx.fillRect(x0 + i * pw, y0, pw - 3, ph * 0.46);
      const sh = this.shift(p); ctx.fillStyle = `rgb(${sh.map((v) => v | 0).join(',')})`; ctx.fillRect(x0 + i * pw, y0 + ph * 0.5, pw - 3, ph * 0.46);
    });
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, pw * patches.length - 3, ph * 0.46); ctx.strokeRect(x0, y0 + ph * 0.5, pw * patches.length - 3, ph * 0.46);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('straight on', x0, y0 - 8); ctx.fillText(`off-axis at ${this.ang}°`, x0, y0 + ph * 0.5 - 8);
    const msg: Record<string, string> = { ips: 'IPS — colour and contrast hold; only a slight wash and bluish glow', va: 'VA — deep blacks but shadows lift and gamma washes off-axis', tn: 'TN — heavy colour cast, and past ~50° the tones invert' };
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(msg[this.panel], w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new PanelAngles());
