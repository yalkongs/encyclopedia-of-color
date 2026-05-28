import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const GREY = 'rgb(128,128,128)';
const STRIPES = 11;

class WhiteIllusion {
  private stage: CanvasStage;
  private reveal: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.reveal = (hydrateFromUrl('reveal') as 'off' | 'on') ?? 'off';
    (document.getElementById('reveal') as EncToggle).value = this.reveal;
    registerStateParam('reveal', () => this.reveal);
    (document.getElementById('reveal') as EncToggle).addEventListener('change', (e) => {
      this.reveal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.reveal = 'off';
      (document.getElementById('reveal') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;

    if (this.reveal === 'on') {
      ctx.fillStyle = '#9a9a90'; ctx.fillRect(0, 0, w, h);
      const s = Math.min(w * 0.22, h * 0.4), cy = h * 0.46;
      ctx.fillStyle = GREY;
      ctx.fillRect(w * 0.5 - s - 2, cy - s / 2, s, s);
      ctx.fillRect(w * 0.5 + 2, cy - s / 2, s, s);
      ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.5 - s - 2, cy - s / 2, s, s); ctx.strokeRect(w * 0.5 + 2, cy - s / 2, s, s);
      ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('on neutral — the two greys are identical', w / 2, cy + s / 2 + 30);
      ctx.textAlign = 'left';
      return;
    }

    const gx = 36, gw = w - 72, gy = 52, gh = h * 0.62;
    const sw = gw / STRIPES;
    for (let i = 0; i < STRIPES; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#16161c' : '#f0ece0';
      ctx.fillRect(gx + i * sw, gy, sw + 0.5, gh);
    }
    // Gray test bars: one on a black stripe, one on a white stripe.
    const segY = gy + gh * 0.32, segH = gh * 0.36;
    const kBlack = 2, kWhite = 7;
    ctx.fillStyle = GREY;
    ctx.fillRect(gx + kBlack * sw, segY, sw, segH);
    ctx.fillRect(gx + kWhite * sw, segY, sw, segH);
    ctx.fillStyle = theme.crimson; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('on black', gx + (kBlack + 0.5) * sw, gy + gh + 18);
    ctx.fillText('on white', gx + (kWhite + 0.5) * sw, gy + gh + 18);
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('both grey bars are the identical grey', gx, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new WhiteIllusion());
