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

const K_SURROUND = 0.85;
const CHANNELS: Record<string, { pos: [number, number, number]; neg: [number, number, number]; posName: string; negName: string }> = {
  rg: { pos: [196, 52, 42], neg: [46, 150, 74], posName: 'red', negName: 'green' },
  by: { pos: [214, 178, 44], neg: [54, 92, 184], posName: 'yellow', negName: 'blue' },
};

function colorOf(ch: string, s: number): string {
  const c = CHANNELS[ch];
  const t = (s + 100) / 200; // 0 = neg pole, 1 = pos pole
  const m = (i: number) => Math.round(c.neg[i] + (c.pos[i] - c.neg[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

class CenterSurroundColor {
  private stage: CanvasStage;
  private centre = 100;
  private surround = -100;
  private channel = 'rg';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.centre = hydrateNumber('centre', 100);
    this.surround = hydrateNumber('surround', -100);
    this.channel = hydrateFromUrl('channel') ?? 'rg';
    (document.getElementById('centre') as EncSlider).value = this.centre;
    (document.getElementById('surround') as EncSlider).value = this.surround;
    (document.getElementById('channel') as EncToggle).value = this.channel;
    registerStateParam('centre', () => this.centre);
    registerStateParam('surround', () => this.surround);
    registerStateParam('channel', () => this.channel);
    for (const id of ['centre', 'surround'] as const) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        this[id] = (e.target as EncSlider).value; this.draw(); notifyStateChange();
      });
    }
    (document.getElementById('channel') as EncToggle).addEventListener('change', (e) => {
      this.channel = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.centre = 100; this.surround = -100; this.channel = 'rg';
      (document.getElementById('centre') as EncSlider).value = 100;
      (document.getElementById('surround') as EncSlider).value = -100;
      (document.getElementById('channel') as EncToggle).value = 'rg';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);
    const ch = CHANNELS[this.channel];

    // --- Receptive field with the chosen stimulus painted in. ---
    const cx = w * 0.32, cy = h * 0.5;
    const Rs = Math.min(w * 0.26, h * 0.40), Rc = Rs * 0.46;
    ctx.fillStyle = colorOf(this.channel, this.surround);
    ctx.beginPath(); ctx.arc(cx, cy, Rs, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = colorOf(this.channel, this.centre);
    ctx.beginPath(); ctx.arc(cx, cy, Rc, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, Rs, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Rc, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('centre', cx, cy + 4);
    ctx.fillText('surround', cx, cy - Rs + 16);
    ctx.textAlign = 'left';

    // --- Response. R peaks for opposite centre/surround colours. ---
    const sc = this.centre / 100, ss = this.surround / 100;
    const R = sc - K_SURROUND * ss; // range ~[-1.85, 1.85]
    const Rn = Math.max(-1, Math.min(1, R / 1.85));

    const bx = w * 0.66, bw = w * 0.26, by = h * 0.5, bhMax = h * 0.34;
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
    ctx.fillStyle = Rn >= 0 ? `rgb(${ch.pos[0]},${ch.pos[1]},${ch.pos[2]})` : `rgb(${ch.neg[0]},${ch.neg[1]},${ch.neg[2]})`;
    const bh = Math.abs(Rn) * bhMax;
    ctx.fillRect(bx, Rn >= 0 ? by - bh : by, bw, bh);
    ctx.strokeStyle = theme.inkAlpha(0.5); ctx.strokeRect(bx, by - bhMax, bw, bhMax * 2);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`prefers ${ch.posName} centre`, bx + bw / 2, by - bhMax - 8);
    ctx.fillText(`prefers ${ch.negName} centre`, bx + bw / 2, by + bhMax + 16);
    ctx.textAlign = 'left';

    // Readout.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`response = ${R.toFixed(2)}`, bx, h * 0.93);
    ctx.fillStyle = theme.inkMute; ctx.font = 'italic 12px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(Math.abs(R) > 1.3 ? 'strong — chromatic edge' : Math.abs(R) < 0.4 ? 'weak — flat colour field' : 'moderate', bx, h * 0.93 + 18);
  }
}
window.addEventListener('DOMContentLoaded', () => new CenterSurroundColor());
