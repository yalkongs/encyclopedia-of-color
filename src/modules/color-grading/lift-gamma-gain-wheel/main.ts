import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const MACBETH: [number, number, number][] = [
  [115, 82, 68], [194, 150, 130], [98, 122, 157], [87, 108, 67], [133, 128, 177], [103, 189, 170],
  [214, 126, 44], [80, 91, 166], [193, 90, 99], [94, 60, 108], [157, 188, 64], [224, 163, 46],
  [56, 61, 150], [70, 148, 73], [175, 54, 60], [231, 199, 31], [187, 86, 149], [8, 133, 161],
  [243, 243, 242], [200, 200, 200], [160, 160, 160], [122, 122, 121], [85, 85, 85], [52, 52, 52],
];

// Weights per zone (x in [0,1])
function wLift(x: number): number { return Math.max(0, 1 - x); }
function wGamma(x: number): number { return 4 * x * (1 - x); }
function wGain(x: number): number { return x; }

// Hue → RGB unit offset (centred at hue, magnitude 1)
function hueOffset(h: number): [number, number, number] {
  const hp = (h % 360) / 60;
  const c = 1, x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = -0.5; // centre around 0 — gives -0.5..+0.5 per channel
  return [r + m, g + m, b + m];
}

class LiftGammaGain {
  private stage: CanvasStage;
  private liftH = 210; private liftA = 20;
  private gammaH = 90; private gammaA = 0;
  private gainH = 30; private gainA = 15;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.liftH = hydrateNumber('liftH', 210); this.liftA = hydrateNumber('liftA', 20);
    this.gammaH = hydrateNumber('gammaH', 90); this.gammaA = hydrateNumber('gammaA', 0);
    this.gainH = hydrateNumber('gainH', 30); this.gainA = hydrateNumber('gainA', 15);
    const bind = (id: string, set: (v: number) => void, init: number) => {
      const s = document.getElementById(id) as EncSlider; s.value = init;
      s.addEventListener('input', (e) => { set((e as CustomEvent).detail.value); this.draw(); notifyStateChange(); });
      return s;
    };
    const lH = bind('liftH', (v) => this.liftH = v, this.liftH);
    const lA = bind('liftA', (v) => this.liftA = v, this.liftA);
    const gH = bind('gammaH', (v) => this.gammaH = v, this.gammaH);
    const gA = bind('gammaA', (v) => this.gammaA = v, this.gammaA);
    const nH = bind('gainH', (v) => this.gainH = v, this.gainH);
    const nA = bind('gainA', (v) => this.gainA = v, this.gainA);
    registerStateParam('liftH', () => Math.round(this.liftH));
    registerStateParam('liftA', () => Math.round(this.liftA));
    registerStateParam('gammaH', () => Math.round(this.gammaH));
    registerStateParam('gammaA', () => Math.round(this.gammaA));
    registerStateParam('gainH', () => Math.round(this.gainH));
    registerStateParam('gainA', () => Math.round(this.gainA));
    document.addEventListener('reset-params', () => {
      this.liftH = 210; this.liftA = 20; this.gammaH = 90; this.gammaA = 0; this.gainH = 30; this.gainA = 15;
      lH.value = 210; lA.value = 20; gH.value = 90; gA.value = 0; nH.value = 30; nA.value = 15;
      this.draw(); notifyStateChange();
    });
  }

  // Apply LGG to a per-channel value in [0,1]
  private gradeChannel(x: number, ch: 0 | 1 | 2): number {
    const oL = hueOffset(this.liftH)[ch] * (this.liftA / 100);
    const oG = hueOffset(this.gammaH)[ch] * (this.gammaA / 100);
    const oN = hueOffset(this.gainH)[ch] * (this.gainA / 100);
    return Math.max(0, Math.min(1, x + wLift(x) * oL + wGamma(x) * oG + wGain(x) * oN));
  }

  private grade(rgb: [number, number, number]): [number, number, number] {
    return [
      Math.round(this.gradeChannel(rgb[0] / 255, 0) * 255),
      Math.round(this.gradeChannel(rgb[1] / 255, 1) * 255),
      Math.round(this.gradeChannel(rgb[2] / 255, 2) * 255),
    ];
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    // Top: tone curves (R/G/B)
    const px = M, py = M + 14, pw = w - 2 * M, ph = 180;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('per-channel tone curves after Lift · Gamma · Gain (input on x, output on y)', M, M + 4);
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(px, py, pw, ph);
    // Identity diagonal
    g.strokeStyle = theme.inkAlpha(0.25); g.setLineDash([3, 3]); g.beginPath();
    g.moveTo(px, py + ph); g.lineTo(px + pw, py); g.stroke(); g.setLineDash([]);
    // Three curves
    const colours = ['#a3132d', '#1f7a4d', '#1f567a'];
    for (let ch = 0; ch < 3; ch++) {
      g.strokeStyle = colours[ch]; g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const y = this.gradeChannel(x, ch as 0 | 1 | 2);
        const X = px + x * pw;
        const Y = py + (1 - y) * ph;
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      }
      g.stroke();
    }
    // Weight functions (faint)
    g.strokeStyle = theme.inkAlpha(0.3); g.lineWidth = 1; g.setLineDash([1, 2]);
    for (const fn of [wLift, wGamma, wGain]) {
      g.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = i / 100; const y = fn(x);
        const X = px + x * pw; const Y = py + (1 - y * 0.25) * ph; // scale weight 0.25
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      }
      g.stroke();
    }
    g.setLineDash([]);
    // Labels
    g.fillStyle = theme.inkAlpha(0.65); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('lift', px + 0.10 * pw, py + ph - 6);
    g.fillText('gamma', px + 0.50 * pw, py + ph - 6);
    g.fillText('gain', px + 0.90 * pw, py + ph - 6);

    // Macbeth grid before / after
    const gridY = py + ph + 36;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('original Macbeth', M, gridY - 4);
    g.fillText('graded', M + (w - 2 * M) / 2 + 8, gridY - 4);

    const colsHalf = 6; const cellW2 = ((w - 3 * M) / 2) / colsHalf;
    const cellH = cellW2 * 0.7;
    for (let i = 0; i < 24; i++) {
      const cx = i % colsHalf, cy = Math.floor(i / colsHalf);
      const [r, gn, b] = MACBETH[i];
      g.fillStyle = `rgb(${r},${gn},${b})`;
      g.fillRect(M + cx * cellW2, gridY + cy * cellH, cellW2 - 2, cellH - 2);
      const [r2, g2, b2] = this.grade(MACBETH[i]);
      g.fillStyle = `rgb(${r2},${g2},${b2})`;
      g.fillRect(M + (w - 2 * M) / 2 + 8 + cx * cellW2, gridY + cy * cellH, cellW2 - 2, cellH - 2);
    }

    // Footnote
    const ny = gridY + 4 * cellH + 14;
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText(`lift hue ${this.liftH}° / ${this.liftA}%   ·   gamma hue ${this.gammaH}° / ${this.gammaA}%   ·   gain hue ${this.gainH}° / ${this.gainA}%`, M, ny);
  }
}

new LiftGammaGain();
