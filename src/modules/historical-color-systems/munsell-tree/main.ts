import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const EXPLAIN: Record<string, string> = {
  munsell: 'equal visual steps — value 1–9, chroma outward, hue around. Numbers chase perception, not arithmetic.',
  ostwald: 'every colour is a recipe: white + black + full colour summing to 100. Order follows the mixture.',
  ncs: 'every colour is a resemblance: how black, how chromatic, and which of the six elementaries it leans toward.',
};

class MunsellPhilosophies {
  private stage: CanvasStage;
  private sys = 'munsell';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.sys = hydrateFromUrl('sys') ?? 'munsell';
    const t = document.getElementById('sys') as EncToggle;
    t.value = this.sys;
    t.addEventListener('change', (e) => { this.sys = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('sys', () => this.sys);
    document.addEventListener('reset-params', () => { this.sys = 'munsell'; t.value = 'munsell'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);

    const colW = (w - 80) / 3, top = 50, colH = h - 150;
    const cols = ['munsell', 'ostwald', 'ncs'];
    const titles = ['Munsell · 1905', 'Ostwald · 1916', 'NCS · 1979'];
    const subs = ['perception', 'mixture', 'resemblance'];

    cols.forEach((key, i) => {
      const x = 40 + i * colW, cw = colW - 24;
      const active = key === this.sys;
      ctx.globalAlpha = active ? 1 : 0.4;
      ctx.fillStyle = active ? theme.crimson : theme.inkMute; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(titles[i], x + cw / 2, top - 24);
      ctx.fillStyle = theme.inkHint; ctx.font = 'italic 11px Inter, sans-serif';
      ctx.fillText(subs[i], x + cw / 2, top - 10);

      if (key === 'munsell') this.munsell(ctx, x, top, cw, colH);
      else if (key === 'ostwald') this.ostwald(ctx, x, top, cw, colH);
      else this.ncs(ctx, x, top, cw, colH);
      ctx.globalAlpha = 1;
      if (active) { ctx.strokeStyle = theme.goldDeep; ctx.lineWidth = 2; ctx.strokeRect(x - 6, top - 40, cw + 12, colH + 48); }
    });

    ctx.fillStyle = theme.inkSoft; ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('three answers to: what makes two colours equally far apart?', w / 2, h - 52);
    ctx.fillStyle = theme.goldDeep; ctx.font = '13px Inter, sans-serif';
    ctx.fillText(EXPLAIN[this.sys], w / 2, h - 26);
  }

  // Munsell: 9-step perceptual value column (equal visual lightness) + a chroma row
  private munsell(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number) {
    const steps = 9, sh = ch / steps;
    for (let i = 0; i < steps; i++) {
      const v = 1 - i / (steps - 1); // 1=white top
      const g = Math.round(255 * Math.pow(v, 1 / 2.2));
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(x, y + i * sh, cw * 0.5, sh);
      ctx.strokeStyle = theme.inkAlpha(0.15); ctx.strokeRect(x, y + i * sh, cw * 0.5, sh);
      ctx.fillStyle = theme.inkMute; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`V${9 - i}`, x + cw * 0.5 + 16, y + i * sh + sh * 0.6);
    }
    // chroma row at mid value
    for (let c = 0; c < 5; c++) {
      const sat = c / 4;
      const r = Math.round(180 + 60 * sat), gg = Math.round(120 - 60 * sat), b = Math.round(120 - 40 * sat);
      ctx.fillStyle = `rgb(${r},${gg},${b})`;
      ctx.fillRect(x + cw * 0.55, y + ch * 0.42 + c * 14, 14, 12);
    }
    ctx.fillStyle = theme.inkHint; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.save(); ctx.translate(x + cw * 0.55, y + ch * 0.42 + 5 * 14 + 12); ctx.fillText('chroma →', 0, 0); ctx.restore();
  }

  // Ostwald: stacked recipe bar white + full colour + black = 100
  private ostwald(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number) {
    const bw = cw * 0.5, bx = x + cw * 0.25;
    const parts = [
      { f: 0.28, css: 'rgb(244,240,228)', label: 'white' },
      { f: 0.44, css: 'rgb(206,150,40)', label: 'full colour' },
      { f: 0.28, css: 'rgb(34,32,40)', label: 'black' },
    ];
    let yy = y;
    for (const p of parts) {
      const ph = ch * p.f;
      ctx.fillStyle = p.css; ctx.fillRect(bx, yy, bw, ph);
      ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(bx, yy, bw, ph);
      ctx.fillStyle = p.label === 'full colour' ? 'rgba(255,255,255,0.9)' : theme.inkMute;
      ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${p.label} ${(p.f * 100).toFixed(0)}`, bx + bw / 2, yy + ph / 2 + 3);
      yy += ph;
    }
    ctx.fillStyle = theme.inkHint; ctx.font = '9px Inter, sans-serif'; ctx.fillText('W + C + B = 100', bx + bw / 2, yy + 14);
  }

  // NCS: blackness/whiteness vertical + chromaticness side, six elementaries
  private ncs(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number) {
    const cx = x + cw * 0.5;
    // vertical W (top) — S (bottom)
    const grad = ctx.createLinearGradient(0, y, 0, y + ch);
    grad.addColorStop(0, 'rgb(244,240,228)'); grad.addColorStop(1, 'rgb(34,32,40)');
    ctx.fillStyle = grad; ctx.fillRect(cx - 16, y, 32, ch);
    ctx.strokeStyle = theme.inkAlpha(0.2); ctx.strokeRect(cx - 16, y, 32, ch);
    ctx.fillStyle = theme.inkMute; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('W', cx, y - 2); ctx.fillText('S', cx, y + ch + 12);
    // four chromatic elementaries around the mid
    const my = y + ch * 0.5;
    const elem = [['Y', 'rgb(232,200,48)', 0, -40], ['R', 'rgb(198,46,46)', 50, 0], ['B', 'rgb(46,90,180)', 0, 40], ['G', 'rgb(60,140,84)', -50, 0]];
    for (const [lab, css, dx, dy] of elem as Array<[string, string, number, number]>) {
      ctx.beginPath(); ctx.arc(cx + dx, my + dy, 10, 0, Math.PI * 2); ctx.fillStyle = css; ctx.fill();
      ctx.fillStyle = theme.inkSoft; ctx.font = '9px Inter, sans-serif'; ctx.fillText(lab, cx + dx, my + dy + 22);
    }
    ctx.fillStyle = theme.inkHint; ctx.font = '9px Inter, sans-serif'; ctx.fillText('s + c + w = 100', cx, y + ch + 26);
  }
}
window.addEventListener('DOMContentLoaded', () => new MunsellPhilosophies());
