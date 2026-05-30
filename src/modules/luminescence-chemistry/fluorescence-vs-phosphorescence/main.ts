import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Path = 'fluorescence' | 'phosphorescence';
const PATHS: Path[] = ['fluorescence', 'phosphorescence'];

class FluoPhos {
  private stage: CanvasStage;
  private path: Path = 'fluorescence';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('path');
    if (raw && (PATHS as string[]).includes(raw)) this.path = raw as Path;
    const t = document.getElementById('path') as EncToggle; t.value = this.path;
    t.addEventListener('change', (e) => { this.path = (e as CustomEvent).detail.value as Path; this.draw(); notifyStateChange(); });
    registerStateParam('path', () => this.path);
    document.addEventListener('reset-params', () => { this.path = 'fluorescence'; t.value = 'fluorescence'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const isFlu = this.path === 'fluorescence';
    const emFluo = 450, emPhos = 520;

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`pathway: ${this.path}`, M, M);

    // Jablonski diagram on the left
    const jx = M + 50, jy = M + 50, jw = 320, jh = 280;
    const S0 = jy + jh - 20, S1 = jy + jh * 0.45, T1 = jy + jh * 0.62;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.strokeRect(jx, jy, jw, jh);

    // Energy levels
    const drawLevel = (yE: number, x0: number, x1: number, label: string, color: string) => {
      g.strokeStyle = color; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x0, yE); g.lineTo(x1, yE); g.stroke();
      g.fillStyle = color; g.font = '11px serif'; g.textAlign = 'left';
      g.fillText(label, x1 + 4, yE + 4);
    };
    drawLevel(S0, jx + 20, jx + 140, 'S₀', theme.ink);
    drawLevel(S1, jx + 20, jx + 140, 'S₁', '#1f567a');
    drawLevel(T1, jx + 200, jx + 280, 'T₁', '#a3132d');

    // Absorption arrow (up)
    g.strokeStyle = '#5a6080'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(jx + 50, S0); g.lineTo(jx + 50, S1);
    g.lineTo(jx + 46, S1 + 6); g.moveTo(jx + 50, S1); g.lineTo(jx + 54, S1 + 6); g.stroke();
    g.fillStyle = '#5a6080'; g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('absorb', jx + 50, S0 + 14);

    // Emission arrow (down)
    g.strokeStyle = isFlu ? '#1f567a' : '#a3132d'; g.lineWidth = 2;
    const emX = isFlu ? jx + 100 : jx + 240;
    const emTop = isFlu ? S1 : T1;
    g.beginPath();
    g.moveTo(emX, emTop); g.lineTo(emX, S0);
    g.lineTo(emX - 4, S0 - 6); g.moveTo(emX, S0); g.lineTo(emX + 4, S0 - 6); g.stroke();
    g.fillStyle = isFlu ? '#1f567a' : '#a3132d'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(this.path, emX, S0 + 14);

    // ISC arrow (S1 → T1) shown if phosphorescence
    if (!isFlu) {
      g.strokeStyle = theme.crimson; g.lineWidth = 1.5; g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(jx + 140, S1); g.lineTo(jx + 200, T1);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = theme.crimson; g.font = '10px serif'; g.textAlign = 'center';
      g.fillText('ISC', jx + 170, (S1 + T1) / 2 - 4);
    }

    // Decay plot on the right
    const px = jx + jw + 50, py = jy, pw = w - px - M, ph = jh / 2 - 10;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('emission decay (log time)', px + pw / 2, py - 6);
    // Fluorescence (ns) marker
    g.strokeStyle = '#1f567a'; g.lineWidth = isFlu ? 2.5 : 1.2;
    g.beginPath();
    const tauF = 5; // ns
    for (let logT = -1; logT <= 4; logT += 0.05) {
      const t = Math.pow(10, logT);
      const I = Math.exp(-t / tauF);
      const X = px + ((logT + 1) / 5) * pw;
      const Y = py + (1 - I) * ph;
      if (logT === -1) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();
    // Phosphorescence (ms) marker
    g.strokeStyle = '#a3132d'; g.lineWidth = isFlu ? 1.2 : 2.5;
    g.beginPath();
    const tauP = 1e7; // ns = 10 ms
    for (let logT = -1; logT <= 8; logT += 0.05) {
      const t = Math.pow(10, logT);
      const I = Math.exp(-t / tauP);
      const X = px + ((logT + 1) / 9) * pw;
      const Y = py + (1 - I) * ph;
      if (logT === -1) g.moveTo(X, Y); else g.lineTo(X, Y);
    }
    g.stroke();
    g.fillStyle = theme.inkAlpha(0.6); g.font = '10px serif'; g.textAlign = 'center';
    g.fillText('ns', px + pw * 0.10, py + ph + 14);
    g.fillText('µs', px + pw * 0.35, py + ph + 14);
    g.fillText('ms', px + pw * 0.6, py + ph + 14);
    g.fillText('s', px + pw * 0.85, py + ph + 14);

    // Emission swatch
    const ey = py + ph + 40;
    const eW = 100;
    const lam = isFlu ? emFluo : emPhos;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('emission colour (Stokes-shifted):', px, ey);
    g.fillStyle = wavelengthCss(lam);
    g.fillRect(px + 220, ey - 14, eW, 22);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px + 220, ey - 14, eW, 22);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(`λ_em ≈ ${lam} nm`, px + 220, ey + 28);
    g.fillText(`τ ≈ ${isFlu ? '~5 ns' : '~10 ms'}`, px + 220, ey + 44);
    g.fillText(`Φ ≈ ${isFlu ? '~0.5' : '~0.05'}`, px + 220, ey + 60);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Phosphorescence is spin-forbidden — gets a kinetic boost from heavy atoms (Br, I) or transition-metal complexes. Time-gated detection separates the two cleanly.', M, h - M);
  }
}

new FluoPhos();
