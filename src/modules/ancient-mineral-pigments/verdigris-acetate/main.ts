import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Verdigris {
  private stage: CanvasStage;
  private yr = 50;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.yr = hydrateNumber('yr', 50);
    const s = document.getElementById('yr') as EncSlider; s.value = this.yr;
    s.addEventListener('input', (e) => { this.yr = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('yr', () => Math.round(this.yr));
    document.addEventListener('reset-params', () => { this.yr = 50; s.value = 50; this.draw(); notifyStateChange(); });
  }

  private color(yr: number): string {
    // fresh teal #2aa088 → century-darkened #5a6038
    const t = Math.min(1, yr / 500);
    const r = Math.round(0x2a * (1 - t) + 0x5a * t);
    const gC = Math.round(0xa0 * (1 - t) + 0x60 * t);
    const b = Math.round(0x88 * (1 - t) + 0x38 * t);
    return `rgb(${r},${gC},${b})`;
  }

  private parchmentDamage(yr: number): number {
    // Fraction of parchment under verdigris that has been eaten through
    return Math.min(0.5, yr / 1000);
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.color(this.yr);
    const dmg = this.parchmentDamage(this.yr);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Age ${Math.round(this.yr)} yr · verdigris tint = ${col} · parchment damage = ${(dmg * 100).toFixed(0)} %`, M, M);

    // Illuminated parchment leaf
    const px = M, py = M + 30, pw = (w - 2 * M) * 0.55, ph = h - 2 * M - 70;
    g.fillStyle = '#f0e0c0'; g.fillRect(px, py, pw, ph);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);

    // Decorative initial (verdigris)
    const ix = px + 30, iy = py + 30, is = 100;
    g.fillStyle = col; g.fillRect(ix, iy, is, is);
    // Damage holes
    g.fillStyle = '#2a1a14';
    for (let k = 0; k < dmg * 24; k++) {
      const r = 2 + Math.random() * 4;
      g.beginPath(); g.arc(ix + Math.random() * is, iy + Math.random() * is, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(ix, iy, is, is);
    g.fillStyle = '#f0e0c0'; g.font = 'bold 70px serif'; g.textAlign = 'center';
    g.fillText('A', ix + is / 2, iy + is - 14);

    // Text lines below initial
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'left';
    for (let line = 0; line < 8; line++) {
      const yy = py + 160 + line * 18;
      g.fillStyle = `rgba(40,30,20,${0.7 - dmg * 0.5})`;
      g.fillText('Lorem ipsum dolor sit amet consectetur adipiscing elit.', px + 30, yy);
    }
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('illuminated manuscript page with verdigris initial', px + pw / 2, py + ph + 16);

    // Right: chemistry note
    const sx = px + pw + 30, sy = py + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('verdigris Cu(CH₃COO)₂', sx, sy);

    // Copper sheet diagram
    g.fillStyle = '#c08840'; g.fillRect(sx, sy + 20, 200, 30);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy + 20, 200, 30);
    g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Cu sheet', sx + 100, sy + 38);
    // Vinegar drops
    g.strokeStyle = theme.crimson;
    for (let k = 0; k < 5; k++) {
      const dx = sx + 20 + k * 40;
      g.beginPath(); g.moveTo(dx, sy + 60); g.lineTo(dx, sy + 80);
      g.lineTo(dx - 3, sy + 76); g.moveTo(dx, sy + 80); g.lineTo(dx + 3, sy + 76); g.stroke();
    }
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('CH₃COOH vinegar vapour', sx + 100, sy + 92);
    // Green crust
    g.fillStyle = col; g.fillRect(sx, sy + 110, 200, 24);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(sx, sy + 110, 200, 24);
    g.fillStyle = '#fff'; g.fillText('Cu(CH₃COO)₂ crust → scrape', sx + 100, sy + 126);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Verdigris is a "fugitive" pigment — brilliant fresh but slowly darkens in oil and chemically degrades the cellulose underneath.', M, h - M);
  }
}

new Verdigris();
