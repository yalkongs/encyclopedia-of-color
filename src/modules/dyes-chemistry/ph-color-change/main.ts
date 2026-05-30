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

type IndKey = 'methyl-orange' | 'btb' | 'phenolphthalein';
const INDS: IndKey[] = ['methyl-orange', 'btb', 'phenolphthalein'];
const INDICATORS: Record<IndKey, { name: string; pKa: number; acid: [number, number, number]; base: [number, number, number] }> = {
  'methyl-orange':   { name: 'methyl orange',   pKa: 3.7,  acid: [205, 50, 25],   base: [240, 175, 50] },
  'btb':             { name: 'bromothymol blue',pKa: 7.1,  acid: [220, 200, 60],  base: [40, 90, 180] },
  'phenolphthalein': { name: 'phenolphthalein', pKa: 9.4,  acid: [245, 245, 240], base: [225, 85, 170] },
};

function fractionBase(pH: number, pKa: number): number {
  // [In-]/([In-]+[HIn]) = 1/(1 + 10^(pKa-pH))
  return 1 / (1 + Math.pow(10, pKa - pH));
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

class PhIndicator {
  private stage: CanvasStage;
  private pH = 70; // ×10⁻¹ → 7.0
  private ind: IndKey = 'btb';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.pH = hydrateNumber('pH', 70);
    const raw = hydrateFromUrl('ind');
    if (raw && (INDS as string[]).includes(raw)) this.ind = raw as IndKey;
    const sP = document.getElementById('pH') as EncSlider; sP.value = this.pH;
    sP.addEventListener('input', (e) => { this.pH = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tI = document.getElementById('ind') as EncToggle; tI.value = this.ind;
    tI.addEventListener('change', (e) => { this.ind = (e as CustomEvent).detail.value as IndKey; this.draw(); notifyStateChange(); });
    registerStateParam('pH', () => Math.round(this.pH));
    registerStateParam('ind', () => this.ind);
    document.addEventListener('reset-params', () => { this.pH = 70; this.ind = 'btb'; sP.value = 70; tI.value = 'btb'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const pH = this.pH / 10;
    const ind = INDICATORS[this.ind];
    const frac = fractionBase(pH, ind.pKa);
    const colour = mix(ind.acid, ind.base, frac);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pH = ${pH.toFixed(1)} · ${ind.name} (pKa ${ind.pKa}) · base fraction = ${frac.toFixed(3)}`, M, M);

    // Beaker swatch
    const jX = M + 30, jY = M + 40, jW = 130, jH = 200;
    g.fillStyle = `rgb(${Math.round(colour[0])},${Math.round(colour[1])},${Math.round(colour[2])})`;
    g.fillRect(jX, jY, jW, jH);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(jX, jY, jW, jH);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('beaker', jX + jW / 2, jY + jH + 18);

    // Titration curve (S-curve) plotted: fraction vs pH
    const px = jX + jW + 50, py = jY, pw = (w - px - M) * 0.55, ph = jH;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('fraction in base form vs pH', px + pw / 2, py - 6);
    g.fillText('pH →', px + pw / 2, py + ph + 18);
    const X = (p: number) => px + (p / 14) * pw;
    const Y = (f: number) => py + (1 - f) * ph;
    // Sigmoid
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath();
    for (let p = 0; p <= 14; p += 0.05) {
      const X0 = X(p), Y0 = Y(fractionBase(p, ind.pKa));
      if (p === 0) g.moveTo(X0, Y0); else g.lineTo(X0, Y0);
    }
    g.stroke();
    // pKa marker
    g.strokeStyle = theme.gold; g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(ind.pKa), py); g.lineTo(X(ind.pKa), py + ph); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.gold; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`pKa ${ind.pKa}`, X(ind.pKa), py - 4);
    // Current point
    g.fillStyle = theme.ink; g.beginPath(); g.arc(X(pH), Y(frac), 5, 0, Math.PI * 2); g.fill();

    // Right table: 3 indicators
    const tx = px + pw + 30, ty = py;
    if (w - tx > 150) {
      g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
      g.fillText('indicator pKa table:', tx, ty + 2);
      let yy = ty + 22;
      for (const k of INDS) {
        const it = INDICATORS[k];
        g.fillStyle = k === this.ind ? theme.crimson : theme.ink;
        g.font = '11px serif';
        g.fillText(`${it.name}`, tx, yy);
        g.fillStyle = theme.inkAlpha(0.7); g.font = '11px monospace';
        g.fillText(`pKa = ${it.pKa}`, tx, yy + 14);
        // mini swatch acid-mid-base
        g.fillStyle = `rgb(${it.acid[0]},${it.acid[1]},${it.acid[2]})`; g.fillRect(tx, yy + 22, 22, 14);
        g.fillStyle = `rgb(${(it.acid[0] + it.base[0]) / 2},${(it.acid[1] + it.base[1]) / 2},${(it.acid[2] + it.base[2]) / 2})`; g.fillRect(tx + 22, yy + 22, 22, 14);
        g.fillStyle = `rgb(${it.base[0]},${it.base[1]},${it.base[2]})`; g.fillRect(tx + 44, yy + 22, 22, 14);
        g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(tx, yy + 22, 66, 14);
        g.fillStyle = theme.inkAlpha(0.55); g.font = '10px serif';
        g.fillText('acid · mid · base', tx, yy + 50);
        yy += 70;
      }
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Transition range is pKa ± 1. Pick an indicator whose pKa lies near the equivalence-point pH of your titration.', M, h - M);
  }
}

new PhIndicator();
