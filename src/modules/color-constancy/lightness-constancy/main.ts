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

const WHITE_REFL = 0.92, GROUND_REFL = 0.8;

class LightnessConstancy {
  private stage: CanvasStage;
  private shadow = 55;
  private meter: 'off' | 'on' = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.shadow = hydrateNumber('shadow', 55);
    this.meter = (hydrateFromUrl('meter') as 'off' | 'on') ?? 'off';
    (document.getElementById('shadow') as EncSlider).value = this.shadow;
    (document.getElementById('meter') as EncToggle).value = this.meter;
    registerStateParam('shadow', () => this.shadow);
    registerStateParam('meter', () => this.meter);
    (document.getElementById('shadow') as EncSlider).addEventListener('input', (e) => {
      this.shadow = (e.target as EncSlider).value; this.draw(); notifyStateChange();
    });
    (document.getElementById('meter') as EncToggle).addEventListener('change', (e) => {
      this.meter = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.shadow = 55; this.meter = 'off';
      (document.getElementById('shadow') as EncSlider).value = 55;
      (document.getElementById('meter') as EncToggle).value = 'off';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const shadowIllum = 1 - this.shadow / 100;
    const g = (v: number) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };

    // Ground: lit everywhere, then a shadow cast over the right half.
    ctx.fillStyle = g(GROUND_REFL); ctx.fillRect(0, 0, w, h);
    const edge = w * 0.5;
    ctx.fillStyle = g(GROUND_REFL * shadowIllum);
    ctx.beginPath(); ctx.moveTo(edge - 30, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(edge + 30, h); ctx.closePath(); ctx.fill();

    // Cards: lit grey (left) and shadowed white (right), equal luminance.
    const V = WHITE_REFL * shadowIllum;     // shadowed white luminance
    const cardVal = g(V);                    // lit grey reflectance = V (lit illum = 1)
    const cw = w * 0.2, ch = h * 0.34;
    const litX = w * 0.16, litY = h * 0.34;
    const shX = w * 0.64, shY = h * 0.34;
    ctx.fillStyle = cardVal; ctx.fillRect(litX, litY, cw, ch); ctx.fillRect(shX, shY, cw, ch);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1;
    ctx.strokeRect(litX, litY, cw, ch); ctx.strokeRect(shX, shY, cw, ch);

    // Labels.
    ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('grey card · sunlight', litX + cw / 2, litY - 12);
    ctx.fillStyle = '#f0ece0';
    ctx.fillText('white card · shadow', shX + cw / 2, shY - 12);

    if (this.meter === 'on') {
      const lum = Math.round(V * 100);
      ctx.fillStyle = theme.crimson; ctx.font = '600 13px JetBrains Mono, monospace';
      ctx.fillText(`L = ${lum}`, litX + cw / 2, litY + ch / 2 + 5);
      ctx.fillText(`L = ${lum}`, shX + cw / 2, shY + ch / 2 + 5);
      // Connector proving equality.
      ctx.strokeStyle = theme.crimson; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(litX + cw, litY + ch / 2); ctx.lineTo(shX, shY + ch / 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(this.meter === 'on' ? 'equal luminance — yet one reads white, the other grey' : 'a grey card in sun, a white card in shadow', w * 0.12, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new LightnessConstancy());
