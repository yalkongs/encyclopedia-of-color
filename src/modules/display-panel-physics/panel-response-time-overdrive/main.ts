import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class ResponseOverdrive {
  private stage: CanvasStage;
  private rt = 16; private od = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.rt = hydrateNumber('rt', 16); this.od = hydrateNumber('od', 0);
    for (const k of ['rt', 'od'] as const) {
      const el = document.getElementById(k) as EncSlider;
      el.value = (this as any)[k];
      el.addEventListener('input', (e) => { (this as any)[k] = (e as CustomEvent).detail.value; notifyStateChange(); });
      registerStateParam(k, () => Math.round((this as any)[k]));
    }
    document.addEventListener('reset-params', () => { this.rt = 16; this.od = 0; (document.getElementById('rt') as EncSlider).value = 16; (document.getElementById('od') as EncSlider).value = 0; notifyStateChange(); });
    startAnimation((t) => this.draw(t));
  }

  private draw(tSec: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#202024'; ctx.fillRect(0, 0, w, h);
    const margin = 60, span = w - 2 * margin, period = 2.6;
    const ph = (tSec % period) / period;
    const cx = margin + span * (0.5 - 0.5 * Math.cos(ph * 2 * Math.PI));
    const vel = span * Math.PI * Math.sin(ph * 2 * Math.PI) / period; // px/s, signed
    const barW = 60, y0 = 60, bh = h - 130;
    // trail length ∝ response time × speed
    const trail = (this.rt / 1000) * Math.abs(vel) * 1.2;
    const dir = Math.sign(vel) || 1;

    // bar
    ctx.fillStyle = '#f4f4f8'; ctx.fillRect(cx - barW / 2, y0, barW, bh);
    // ghost trail behind (opposite to motion)
    if (trail > 2) {
      const tx = cx - dir * barW / 2;
      const grad = ctx.createLinearGradient(tx, 0, tx - dir * trail, 0);
      grad.addColorStop(0, 'rgba(244,244,248,0.6)'); grad.addColorStop(1, 'rgba(244,244,248,0)');
      ctx.fillStyle = grad; ctx.fillRect(Math.min(tx, tx - dir * trail), y0, trail, bh);
    }
    // overdrive overshoot: bright sliver at leading edge, dark inverse-ghost at trailing if pushed
    const odf = this.od / 100;
    if (odf > 0.05) {
      const lead = cx + dir * barW / 2;
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, odf)})`; ctx.fillRect(Math.min(lead, lead + dir * 10), y0, 10, bh);
      if (odf > 0.55) { // over-overdrive → dark inverse ghost behind
        const tx = cx - dir * barW / 2 - dir * trail;
        ctx.fillStyle = `rgba(0,0,0,${(odf - 0.55) * 1.2})`; ctx.fillRect(Math.min(tx, tx - dir * 16), y0, 16, bh);
      }
    }

    ctx.fillStyle = 'rgba(244,244,248,0.7)'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`response ${this.rt} ms · overdrive ${this.od}%`, 30, 40);
    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.od > 55 ? 'over-driven — a dark inverse-ghost trails the edge' : this.od > 5 ? 'overdrive sharpens the trailing ghost' : 'slow response leaves a fading ghost trail', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new ResponseOverdrive());
