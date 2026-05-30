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

function hslHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0]; else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x]; else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  const m = l - c / 2; const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

class FoilStamping {
  private stage: CanvasStage;
  private tilt = 60;
  private foil = 'holo';
  private off: HTMLCanvasElement;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.off = document.createElement('canvas');
    this.stage.addEventListener('stageresize', () => this.draw());
    this.tilt = hydrateNumber('tilt', 60);
    this.foil = hydrateFromUrl('foil') ?? 'holo';
    const st = document.getElementById('tilt') as EncSlider;
    st.value = this.tilt;
    st.addEventListener('input', (e) => { this.tilt = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('tilt', () => Math.round(this.tilt));
    const tf = document.getElementById('foil') as EncToggle;
    tf.value = this.foil;
    tf.addEventListener('change', (e) => { this.foil = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('foil', () => this.foil);
    document.addEventListener('reset-params', () => { this.tilt = 60; this.foil = 'holo'; st.value = 60; tf.value = 'holo'; this.draw(); notifyStateChange(); });
  }

  // build a mask of the stamped shape (filled letter) on the offscreen canvas
  private buildMask(w: number, h: number): ImageData {
    const oc = this.off; oc.width = w; oc.height = h;
    const c = oc.getContext('2d')!;
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#000'; c.textBaseline = 'middle'; c.textAlign = 'center';
    const fs = Math.min(w, h) * 0.78;
    c.font = `900 ${fs}px Georgia, serif`;
    c.fillText('★', w / 2, h / 2 + fs * 0.04);
    return c.getImageData(0, 0, w, h);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#f0ece2'; ctx.fillRect(0, 0, w, h);   // cream paper
    const x0 = 40, y0 = 50, x1 = w - 40, y1 = h - 64, gw = x1 - x0, gh = y1 - y0;
    const mask = this.buildMask(Math.ceil(gw), Math.ceil(gh));
    const md = mask.data;
    const holo = this.foil === 'holo';
    const tlt = this.tilt;

    const out = ctx.getImageData(x0, y0, Math.ceil(gw), Math.ceil(gh));
    const od = out.data;
    for (let py = 0; py < Math.ceil(gh); py++) {
      for (let px = 0; px < Math.ceil(gw); px++) {
        const i = (py * Math.ceil(gw) + px) * 4;
        const inside = md[i] < 128;
        if (!inside) continue; // leave paper colour
        let r = 0, g = 0, b = 0;
        if (holo) {
          // surface-relief grating: hue depends on position + tilt; slides as tilt changes
          const hue = (px / gw * 720 + py / gh * 180 + tlt * 4) % 360;
          const sat = 0.85, lig = 0.50 + 0.15 * Math.sin(((px + py * 0.6) / gw) * Math.PI * 4 + tlt * 0.07);
          const hex = hslHex(hue, sat, Math.max(0.3, Math.min(0.75, lig)));
          r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16);
        } else {
          // solid gold with a sliding specular highlight
          const sheen = Math.exp(-((px / gw - (tlt / 180)) ** 2) / 0.025);
          r = Math.min(255, 200 + sheen * 55); g = Math.min(255, 158 + sheen * 70); b = Math.min(255, 52 + sheen * 90);
        }
        od[i] = r; od[i + 1] = g; od[i + 2] = b; od[i + 3] = 255;
      }
    }
    ctx.putImageData(out, x0, y0);
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, gw, gh);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(holo
      ? `holographic foil — a diffraction grating; many hues at once, the whole rainbow slides with tilt (${Math.round(tlt)}°)`
      : `gold foil — solid metal; only the bright sheen drifts across the shape as you tilt (${Math.round(tlt)}°)`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new FoilStamping());
