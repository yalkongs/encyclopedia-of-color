import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const RES_WIDTH = 60; // plasmon resonance half-width (nm)

class Sers {
  private stage: CanvasStage;
  private gap = 2.0;     // nm
  private detune = 0;    // nm from resonance
  private size = 40;     // nm radius

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.gap = hydrateNumber('gap', 2.0);
    this.detune = hydrateNumber('detune', 0);
    this.size = hydrateNumber('size', 40);
    (document.getElementById('gap') as EncSlider).value = this.gap;
    (document.getElementById('detune') as EncSlider).value = this.detune;
    (document.getElementById('size') as EncSlider).value = this.size;
    registerStateParam('gap', () => this.gap);
    registerStateParam('detune', () => this.detune);
    registerStateParam('size', () => this.size);
    for (const id of ['gap', 'detune', 'size']) {
      (document.getElementById(id) as EncSlider).addEventListener('input', (e) => {
        const v = (e.target as EncSlider).value;
        if (id === 'gap') this.gap = v;
        else if (id === 'detune') this.detune = v;
        else this.size = v;
        this.draw(); notifyStateChange();
      });
    }
    document.addEventListener('reset-params', () => {
      this.gap = 2.0; this.detune = 0; this.size = 40;
      (document.getElementById('gap') as EncSlider).value = 2.0;
      (document.getElementById('detune') as EncSlider).value = 0;
      (document.getElementById('size') as EncSlider).value = 40;
      this.draw(); notifyStateChange();
    });
  }

  // Local field enhancement g = |E_loc/E_0| (illustrative model).
  private fieldEnhancement(): number {
    const lorentz = 1 / (1 + (this.detune / RES_WIDTH) ** 2);     // resonance
    const gapBoost = 1 + 28 * Math.exp(-this.gap / 2.2);           // hot-spot vs gap
    const sizeBoost = 0.6 + this.size / 50;                        // larger ⇒ stronger
    return 3 + 12 * lorentz * gapBoost * sizeBoost;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const g = this.fieldEnhancement();
    const EF = Math.pow(g, 4);

    // Two nanoparticles with a gap, hot spot between.
    const cy = h * 0.4;
    const rPx = Math.min(h * 0.18, 30 + this.size * 0.9);
    const gapPx = Math.max(4, this.gap * 4);
    const cx = w * 0.42;
    const p1x = cx - rPx - gapPx / 2;
    const p2x = cx + rPx + gapPx / 2;

    // Hot-spot glow in the gap (intensity ∝ g²).
    const glow = Math.min(1, (g * g) / 600);
    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rPx * 1.2);
    hg.addColorStop(0, `rgba(255,220,120,${glow})`);
    hg.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(cx - rPx * 1.2, cy - rPx * 1.2, rPx * 2.4, rPx * 2.4);

    // Gold nanoparticles.
    for (const px of [p1x, p2x]) {
      const grad = ctx.createRadialGradient(px - rPx * 0.3, cy - rPx * 0.3, rPx * 0.2, px, cy, rPx);
      grad.addColorStop(0, '#f4d58a');
      grad.addColorStop(1, '#a8842f');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, cy, rPx, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1; ctx.stroke();
    }
    // Gap caliper.
    ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p1x + rPx, cy + rPx + 8); ctx.lineTo(p2x - rPx, cy + rPx + 8); ctx.stroke();
    ctx.fillStyle = theme.goldDeep; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`gap ${this.gap.toFixed(1)} nm`, cx - 26, cy + rPx + 22);

    // Enhancement factor log bar.
    const barX = w * 0.08, barY = h * 0.74, barW = w * 0.7, barH = 16;
    const log10 = Math.log10(EF);
    const maxLog = 11;
    ctx.fillStyle = theme.slateAlpha(0.15); ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = theme.crimson; ctx.fillRect(barX, barY, barW * Math.min(1, log10 / maxLog), barH);
    ctx.strokeStyle = theme.inkAlpha(0.4); ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif';
    for (let e = 0; e <= maxLog; e += 2) {
      const x = barX + barW * (e / maxLog);
      ctx.fillText(`10${superscript(e)}`, x - 8, barY + barH + 14);
    }

    // Mantissa formatting for EF.
    const exp = Math.floor(log10);
    const mant = EF / Math.pow(10, exp);

    // Readouts.
    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`field enhancement |E_loc/E₀| = ${g.toFixed(1)}`, barX, 30);
    ctx.fillText(`Raman enhancement EF = |E_loc/E₀|⁴ ≈ ${mant.toFixed(1)}×10${superscript(exp)}`, barX, 52);
    ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
    const detLabel = Math.abs(this.detune) < 5 ? 'on resonance' : `${this.detune > 0 ? '+' : ''}${this.detune} nm off resonance`;
    ctx.fillText(`particle r = ${this.size} nm · ${detLabel} · single-molecule SERS needs ~10⁸`, barX, barY - 8);
  }
}

function superscript(n: number): string {
  const map: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map((ch) => map[ch] ?? ch).join('');
}

window.addEventListener('DOMContentLoaded', () => new Sers());
