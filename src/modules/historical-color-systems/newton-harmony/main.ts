import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

// Newton's seven colours; width in semitone units (tone=2, semitone=1), Dorian D-E-F-G-A-B-C.
const COLORS = [
  { name: 'red', note: 'D', css: 'rgb(198,42,42)', u: 2 },
  { name: 'orange', note: 'E', css: 'rgb(222,120,28)', u: 1 },
  { name: 'yellow', note: 'F', css: 'rgb(230,198,40)', u: 2 },
  { name: 'green', note: 'G', css: 'rgb(52,150,72)', u: 2 },
  { name: 'blue', note: 'A', css: 'rgb(42,92,182)', u: 2 },
  { name: 'indigo', note: 'B', css: 'rgb(72,42,132)', u: 1 },
  { name: 'violet', note: 'C', css: 'rgb(140,52,162)', u: 2 },
];
const TOTAL_U = COLORS.reduce((s, c) => s + c.u, 0); // 12

class NewtonWheel {
  private stage: CanvasStage;
  private div = 'musical';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.div = hydrateFromUrl('div') ?? 'musical';
    const t = document.getElementById('div') as EncToggle;
    t.value = this.div;
    t.addEventListener('change', (e) => { this.div = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('div', () => this.div);
    document.addEventListener('reset-params', () => { this.div = 'musical'; t.value = 'musical'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.48, R = Math.min(w, h) * 0.36;
    const musical = this.div === 'musical';

    let a0 = -Math.PI / 2; // start at top
    for (const c of COLORS) {
      const frac = musical ? c.u / TOTAL_U : 1 / COLORS.length;
      const a1 = a0 + frac * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = c.css; ctx.fill();
      ctx.strokeStyle = theme.paperBg; ctx.lineWidth = 2; ctx.stroke();
      // semitone marker (narrow sectors) in musical mode
      const mid = (a0 + a1) / 2;
      const lx = cx + R * 0.72 * Math.cos(mid), ly = cy + R * 0.72 * Math.sin(mid);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (musical) ctx.fillText(c.note, lx, ly);
      if (musical && c.u === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'italic 9px Inter, sans-serif';
        ctx.fillText('semitone', lx, ly + 14);
      }
      a0 = a1;
    }
    ctx.textBaseline = 'alphabetic';
    // hub
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2); ctx.fillStyle = theme.paper; ctx.fill(); ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(musical
      ? 'sectors sized by Dorian intervals — orange & indigo are the narrow semitones'
      : 'an equal seven-way split — not what Newton drew', cx, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new NewtonWheel());
