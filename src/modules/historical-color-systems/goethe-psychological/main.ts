import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class GoetheTriangle {
  private stage: CanvasStage;
  private pole = 'polarity';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pole = hydrateFromUrl('pole') ?? 'polarity';
    const t = document.getElementById('pole') as EncToggle;
    t.value = this.pole;
    t.addEventListener('change', (e) => { this.pole = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pole', () => this.pole);
    document.addEventListener('reset-params', () => { this.pole = 'polarity'; t.value = 'polarity'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const polarity = this.pole === 'polarity';

    const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.36;
    // corners: yellow top, red lower-right, blue lower-left
    const Y = [cx, cy - R];
    const Rd = [cx + R * Math.cos(Math.PI / 6), cy + R * Math.sin(Math.PI / 6)];
    const Bl = [cx - R * Math.cos(Math.PI / 6), cy + R * Math.sin(Math.PI / 6)];
    const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const O = mid(Y, Rd), G = mid(Y, Bl), V = mid(Rd, Bl);

    // big triangle outline
    ctx.beginPath(); ctx.moveTo(Y[0], Y[1]); ctx.lineTo(Rd[0], Rd[1]); ctx.lineTo(Bl[0], Bl[1]); ctx.closePath();
    ctx.fillStyle = theme.paper; ctx.fill(); ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.stroke();

    if (polarity) {
      // plus (warm) half tint toward yellow/red; minus (cool) toward blue
      ctx.save(); ctx.beginPath(); ctx.moveTo(Y[0], Y[1]); ctx.lineTo(Rd[0], Rd[1]); ctx.lineTo(V[0], V[1]); ctx.lineTo(G[0], G[1]); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(220,140,40,0.12)'; ctx.fillRect(0, 0, w, h); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.moveTo(Bl[0], Bl[1]); ctx.lineTo(G[0], G[1]); ctx.lineTo(V[0], V[1]); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(50,90,180,0.12)'; ctx.fillRect(0, 0, w, h); ctx.restore();
    }

    const node = (p: number[], css: string, label: string) => {
      ctx.beginPath(); ctx.arc(p[0], p[1], 24, 0, Math.PI * 2); ctx.fillStyle = css; ctx.fill();
      ctx.strokeStyle = theme.inkAlpha(0.4); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = theme.inkSoft; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, p[0], p[1] + 38);
    };
    node(Y, 'rgb(232,200,48)', 'yellow');
    node(O, 'rgb(222,120,30)', 'orange');
    node(Rd, 'rgb(198,46,46)', 'red');
    node(V, 'rgb(130,52,150)', 'violet');
    node(Bl, 'rgb(46,90,180)', 'blue');
    node(G, 'rgb(60,140,84)', 'green');

    if (polarity) {
      ctx.fillStyle = theme.crimson; ctx.font = '700 28px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('+', cx + R * 0.42, cy - R * 0.18);
      ctx.fillText('−', cx - R * 0.42, cy + R * 0.34);
      ctx.fillStyle = theme.inkMute; ctx.font = '11px Inter, sans-serif';
      ctx.fillText('active · advancing', cx + R * 0.5, cy - R * 0.02);
      ctx.fillText('passive · receding', cx - R * 0.5, cy + R * 0.52);
    }

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(polarity
      ? "Goethe's polarity — a felt opposition, not a measurement (loosely echoed by opponent channels)"
      : "Goethe's triangle — three primaries at the corners, their mixtures on the edges", cx, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new GoetheTriangle());
