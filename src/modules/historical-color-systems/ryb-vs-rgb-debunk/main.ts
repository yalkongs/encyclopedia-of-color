import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type C = [number, number, number];
const mul = (a: C, b: C): C => [a[0] * b[0] / 255, a[1] * b[1] / 255, a[2] * b[2] / 255];
const css = (c: C) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

const RYB: { name: string; prim: C[] } = { name: 'RYB (studio)', prim: [[220, 40, 40], [240, 220, 40], [45, 75, 180]] };
const CMY: { name: string; prim: C[] } = { name: 'CMY (printing)', prim: [[0, 170, 235], [235, 0, 140], [255, 240, 0]] };

class RybDebunk {
  private stage: CanvasStage;
  private reveal = 'mixes';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.reveal = hydrateFromUrl('reveal') ?? 'mixes';
    const t = document.getElementById('reveal') as EncToggle;
    t.value = this.reveal;
    t.addEventListener('change', (e) => { this.reveal = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('reveal', () => this.reveal);
    document.addEventListener('reset-params', () => { this.reveal = 'mixes'; t.value = 'mixes'; this.draw(); notifyStateChange(); });
  }

  private triangle(ctx: CanvasRenderingContext2D, set: { name: string; prim: C[] }, cx: number, cy: number, R: number) {
    const showMix = this.reveal === 'mixes';
    const P = set.prim.map((_, i) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / 3);
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number];
    });
    // edge labels for secondaries
    ctx.fillStyle = theme.inkAlpha(0.08);
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.closePath(); ctx.fill();

    if (showMix) {
      // edge midpoint subtractive mixes
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2;
        ctx.beginPath(); ctx.arc(mx, my, 20, 0, Math.PI * 2);
        ctx.fillStyle = css(mul(set.prim[i], set.prim[j])); ctx.fill();
        ctx.strokeStyle = theme.inkAlpha(0.35); ctx.lineWidth = 1; ctx.stroke();
      }
      // centre triple mix
      const tri = mul(mul(set.prim[0], set.prim[1]), set.prim[2]);
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fillStyle = css(tri); ctx.fill(); ctx.strokeStyle = theme.inkAlpha(0.35); ctx.stroke();
    }
    // primary corners
    const names = set === RYB ? ['red', 'yellow', 'blue'] : ['cyan', 'magenta', 'yellow'];
    P.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p[0], p[1], 26, 0, Math.PI * 2); ctx.fillStyle = css(set.prim[i]); ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(names[i], p[0], p[1] - 32);
    });
    ctx.fillStyle = theme.inkSoft; ctx.font = '600 14px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(set.name, cx, cy + R + 44);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const R = Math.min(w * 0.2, h * 0.3);
    this.triangle(ctx, RYB, w * 0.27, h * 0.44, R);
    this.triangle(ctx, CMY, w * 0.73, h * 0.44, R);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.reveal === 'mixes'
      ? 'RYB blue+yellow muddies to a dark green; CMY mixes stay clean — RYB is a convention, not colour science'
      : 'reveal the mixes to compare the secondaries each primary set can make', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new RybDebunk());
