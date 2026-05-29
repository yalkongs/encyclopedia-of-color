import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { startAnimation } from '@core/render/anim';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const INK = '#1a3a6b';

class Inkjet {
  private stage: CanvasStage;
  private mode = 'thermal';
  private freq = 9;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.mode = hydrateFromUrl('mode') ?? 'thermal';
    this.freq = hydrateNumber('freq', 9);
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    const s = document.getElementById('freq') as EncSlider;
    s.value = this.freq;
    s.addEventListener('input', (e) => { this.freq = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('freq', () => Math.round(this.freq));
    document.addEventListener('reset-params', () => { this.mode = 'thermal'; this.freq = 9; t.value = 'thermal'; s.value = 9; notifyStateChange(); });
    startAnimation((tt) => this.frame(tt));
  }

  private frame(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const thermal = this.mode === 'thermal';
    const period = 1 / (this.freq * 0.18);     // visual seconds per drop
    const phase = (t % period) / period;        // 0..1 within a firing cycle

    // nozzle / chamber on the left
    const cx = w * 0.28, chTop = 70, chW = 150, chH = 120, nozzleY = chTop + chH + 30;
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 2;
    ctx.strokeRect(cx - chW / 2, chTop, chW, chH);                       // chamber
    ctx.fillStyle = 'rgba(26,58,107,0.18)'; ctx.fillRect(cx - chW / 2, chTop, chW, chH); // ink
    // nozzle funnel
    ctx.beginPath(); ctx.moveTo(cx - chW / 2, chTop + chH); ctx.lineTo(cx - 10, nozzleY); ctx.lineTo(cx + 10, nozzleY); ctx.lineTo(cx + chW / 2, chTop + chH); ctx.stroke();

    if (thermal) {
      // heater + vapour bubble that grows then collapses in the first part of the cycle
      ctx.fillStyle = '#b0392f'; ctx.fillRect(cx - chW / 2 + 6, chTop + chH - 12, chW - 12, 8); // heater strip
      const b = phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) : 0;
      if (b > 0) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(cx, chTop + chH - 26, 40 * b, 26 * b, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('heater flash-boils a bubble', cx, chTop - 12);
    } else {
      // piezo wall flexes inward early in the cycle
      const flex = phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) * 22 : 0;
      ctx.fillStyle = '#7a5cc0'; ctx.fillRect(cx + chW / 2 - 8, chTop, 8, chH);              // piezo wall
      ctx.fillStyle = 'rgba(122,92,192,0.5)'; ctx.beginPath();
      ctx.moveTo(cx + chW / 2 - 8, chTop); ctx.quadraticCurveTo(cx + chW / 2 - 8 - flex, chTop + chH / 2, cx + chW / 2 - 8, chTop + chH); ctx.lineTo(cx + chW / 2, chTop + chH); ctx.lineTo(cx + chW / 2, chTop); ctx.closePath(); ctx.fill();
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('piezo wall squeezes the chamber', cx, chTop - 12);
    }

    // droplets in flight: launched each period, travel down to the paper
    const paperY = h - 60, travel = period * 0.95, speed = (paperY - nozzleY) / travel;
    const kNow = Math.floor(t / period);
    ctx.fillStyle = INK;
    for (let k = kNow; k >= kNow - 8; k--) {
      const age = t - k * period - 0.4 * period; // ejected after actuation
      if (age < 0 || age > travel) continue;
      const y = nozzleY + age * speed;
      const dx = cx; // straight column
      ctx.beginPath(); ctx.ellipse(dx, y, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      if (thermal) { ctx.beginPath(); ctx.arc(dx, y - 16, 2.4, 0, Math.PI * 2); ctx.fill(); } // satellite
    }
    // paper
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40, paperY); ctx.lineTo(w - 40, paperY); ctx.stroke();
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('paper', 44, paperY + 18);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(thermal
      ? `thermal — a boiled bubble kicks each drop, trailing a small satellite (${Math.round(this.freq)} kHz)`
      : `piezo — a flexing crystal pushes a clean drop, and tolerates inks a heater would cook (${Math.round(this.freq)} kHz)`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Inkjet());
