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

const PRIMS = ['#e23b3b', '#39c24a', '#3b7bff'];
const PNAME = ['R', 'G', 'B'];

class Projector {
  private stage: CanvasStage;
  private grey = 55;
  private engine = 'dlp';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.grey = hydrateNumber('grey', 55);
    this.engine = hydrateFromUrl('engine') ?? 'dlp';
    const s = document.getElementById('grey') as EncSlider;
    s.value = this.grey;
    s.addEventListener('input', (e) => { this.grey = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('grey', () => Math.round(this.grey));
    const t = document.getElementById('engine') as EncToggle;
    t.value = this.engine;
    t.addEventListener('change', (e) => { this.engine = (e as CustomEvent).detail.value; notifyStateChange(); });
    registerStateParam('engine', () => this.engine);
    document.addEventListener('reset-params', () => { this.grey = 55; this.engine = 'dlp'; s.value = 55; t.value = 'dlp'; notifyStateChange(); });
    startAnimation((t) => this.frame(t));
  }

  private frame(t: number) {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, w, h);
    const duty = this.grey / 100;
    if (this.engine === 'dlp') this.drawDLP(ctx, w, h, t, duty); else this.drawLCoS(ctx, w, h, duty);
  }

  private drawDLP(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, duty: number) {
    // micromirror array (left)
    const ax = 50, ay = 70, asz = Math.min(w * 0.32, h - 180), cell = asz / 6;
    const pwm = ((t * 6) % 1) < duty; // shared PWM flicker
    ctx.fillStyle = theme.inkSoft; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('micromirror array', ax, ay - 14);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const x = ax + c * cell, y = ay + r * cell;
      ctx.save(); ctx.translate(x + cell / 2, y + cell / 2);
      ctx.fillStyle = pwm ? '#cdb56a' : '#2a2a30';
      ctx.transform(1, 0, pwm ? -0.4 : 0.4, 1, 0, 0); // skew to suggest tilt
      ctx.fillRect(-cell * 0.4, -cell * 0.4, cell * 0.8, cell * 0.8);
      ctx.restore();
    }
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(pwm ? 'tilted → screen (ON)' : 'tilted → dump (OFF)', ax, ay + asz + 20);
    ctx.fillText(`duty cycle ${Math.round(duty * 100)}%`, ax, ay + asz + 38);

    // colour wheel (right top)
    const wx = w * 0.72, wy = 130, R = 78;
    const ang = t * Math.PI * 2 * 1.4; // rotation
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(wx, wy);
      ctx.arc(wx, wy, R, ang + i * (Math.PI * 2 / 3), ang + (i + 1) * (Math.PI * 2 / 3));
      ctx.closePath(); ctx.fillStyle = PRIMS[i]; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
    }
    // beam position pointer (fixed at top)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, wy - R - 14); ctx.lineTo(wx, wy - R + 6); ctx.stroke();
    // which segment is under the top pointer (angle -90° = -PI/2)
    const rel = ((-Math.PI / 2 - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const seg = Math.floor(rel / (Math.PI * 2 / 3)) % 3;
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('spinning colour wheel', wx, wy - R - 24);

    // instantaneous projected patch (current primary if mirror ON)
    const px = w * 0.62, py = wy + R + 40, pw = w * 0.2, ph = 64;
    ctx.fillStyle = pwm ? PRIMS[seg] : '#0c0c10';
    ctx.fillRect(px, py, pw, ph); ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = theme.inkSoft; ctx.textAlign = 'left'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`instant: ${PNAME[seg]} ${pwm ? 'on' : 'off'}`, px, py - 8);

    // perceived (time-fused) patch — all primaries at duty → neutral at brightness=duty
    const fx = px, fy = py + ph + 36, g = Math.round(Math.pow(duty, 1 / 2.2) * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(fx, fy, pw, ph); ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(fx, fy, pw, ph);
    ctx.fillStyle = theme.inkSoft; ctx.fillText('perceived (fused over time)', fx, fy - 8);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('DLP — one chip flashes R, G, B in turn; grey is mirror duty cycle, and the sequence can flash a rainbow', w / 2, h - 14);
  }

  private drawLCoS(ctx: CanvasRenderingContext2D, w: number, h: number, duty: number) {
    // three steady reflective panels, combined
    const px = 70, py = 110, pw = w * 0.16, ph = 90, gap = 26;
    for (let i = 0; i < 3; i++) {
      const x = px + i * (pw + gap);
      const v = duty;
      ctx.fillStyle = PRIMS[i]; ctx.globalAlpha = 0.35 + 0.6 * v; ctx.fillRect(x, py, pw, ph); ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(x, py, pw, ph);
      ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${PNAME[i]} panel`, x + pw / 2, py - 10);
    }
    // combined output (steady)
    const ox = px + 3 * (pw + gap) + 20, oy = py, ow = w - ox - 60;
    const g = Math.round(Math.pow(duty, 1 / 2.2) * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(ox, oy, ow, ph + 120);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(ox, oy, ow, ph + 120);
    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('combined output (continuous, no flicker)', ox, oy - 10);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('LCoS — three reflective panels hold R, G, B on continuously; no colour wheel, no rainbow break-up', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Projector());
