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
import { drawEnergyLevels } from '@core/render/molecular';

type DCount = 'd4' | 'd5' | 'd6' | 'd7';
const DS: DCount[] = ['d4', 'd5', 'd6', 'd7'];
const PAIRING_E: Record<DCount, number> = { d4: 23, d5: 25, d6: 21, d7: 22 };

// Spectrochemical series (Δ₀ in 10³ cm⁻¹, approximate)
const SPECTRO: { ligand: string; dq: number }[] = [
  { ligand: 'I⁻',     dq: 11 }, { ligand: 'Br⁻', dq: 13 }, { ligand: 'Cl⁻', dq: 14 },
  { ligand: 'F⁻',     dq: 16 }, { ligand: 'OH⁻', dq: 17 }, { ligand: 'H₂O', dq: 19 },
  { ligand: 'NH₃',    dq: 21 }, { ligand: 'en',   dq: 23 }, { ligand: 'NO₂⁻', dq: 27 },
  { ligand: 'CN⁻',    dq: 33 }, { ligand: 'CO',  dq: 35 },
];

class LigandField {
  private stage: CanvasStage;
  private dq = 22;
  private d: DCount = 'd6';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dq = hydrateNumber('dq', 22);
    const raw = hydrateFromUrl('dcount');
    if (raw && (DS as string[]).includes(raw)) this.d = raw as DCount;

    const sDq = document.getElementById('dq') as EncSlider; sDq.value = this.dq;
    sDq.addEventListener('input', (e) => { this.dq = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    const tD = document.getElementById('dcount') as EncToggle; tD.value = this.d;
    tD.addEventListener('change', (e) => { this.d = (e as CustomEvent).detail.value as DCount; this.draw(); notifyStateChange(); });
    registerStateParam('dq', () => Math.round(this.dq));
    registerStateParam('dcount', () => this.d);
    document.addEventListener('reset-params', () => { this.dq = 22; this.d = 'd6'; sDq.value = 22; tD.value = 'd6'; this.draw(); notifyStateChange(); });
  }

  private nElectrons(): number {
    return parseInt(this.d.slice(1), 10);
  }

  private distribution(): { t2g: number; eg: number; lowSpin: boolean; unpaired: number } {
    const n = this.nElectrons();
    const P = PAIRING_E[this.d];
    const lowSpin = this.dq > P;
    let t2g = 0, eg = 0;
    if (!lowSpin) {
      const single = Math.min(5, n);
      t2g = Math.min(3, single);
      eg = single - t2g;
      let remaining = n - single;
      const pairTo = Math.min(3, remaining); t2g += pairTo; remaining -= pairTo;
      const pairEg = Math.min(2, remaining); eg += pairEg;
    } else {
      t2g = Math.min(6, n);
      eg = n - t2g;
    }
    // Unpaired: how many singly-occupied boxes
    let unp = 0;
    if (t2g <= 3) unp += t2g; else unp += (6 - t2g); // 0..3: that many single; 4..6: 6-t2g single
    if (eg <= 2) unp += eg; else unp += (4 - eg);
    return { t2g, eg, lowSpin, unpaired: unp };
  }

  private nearestLigand(): { ligand: string; dq: number } {
    let best = SPECTRO[0], dist = Infinity;
    for (const l of SPECTRO) {
      const d = Math.abs(l.dq - this.dq);
      if (d < dist) { dist = d; best = l; }
    }
    return best;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const dist = this.distribution();
    const P = PAIRING_E[this.d];
    const lig = this.nearestLigand();

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.d.toUpperCase()} · Δ₀ = ${(this.dq * 1000).toLocaleString()} cm⁻¹ · P = ${(P * 1000).toLocaleString()} cm⁻¹ · nearest ligand: ${lig.ligand}`, M, M);

    // Spectrochemical series strip
    const sy = M + 30;
    const sx = M;
    const sw = w - 2 * M;
    const sh = 50;
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('spectrochemical series · weak field (left) → strong field (right)', sx + sw / 2, sy - 4);
    for (const l of SPECTRO) {
      const xMark = sx + ((l.dq - 8) / (35 - 8)) * sw;
      g.fillStyle = theme.ink;
      g.font = '10px serif';
      g.textAlign = 'center';
      g.fillText(l.ligand, xMark, sy + 18);
      g.fillStyle = theme.inkAlpha(0.6); g.font = '9px monospace';
      g.fillText(`${l.dq}k`, xMark, sy + 32);
    }
    // Active marker
    const xCur = sx + ((this.dq - 8) / (35 - 8)) * sw;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath(); g.moveTo(xCur, sy); g.lineTo(xCur, sy + sh); g.stroke();
    // P marker
    const xP = sx + ((P - 8) / (35 - 8)) * sw;
    g.strokeStyle = theme.gold; g.lineWidth = 1.5; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(xP, sy); g.lineTo(xP, sy + sh); g.stroke();
    g.setLineDash([]);
    g.fillStyle = theme.gold; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`P=${P}k`, xP, sy + sh + 14);

    // Energy level diagrams: high-spin and low-spin side by side, with active highlighted
    const ey = sy + sh + 50;
    const eh = 200;
    const cw = w / 2;

    // Left: high-spin
    g.fillStyle = !dist.lowSpin ? theme.crimson : theme.inkAlpha(0.7);
    g.font = '13px serif'; g.textAlign = 'center';
    g.fillText('high spin (Δ < P)', cw / 2, ey - 8);
    {
      const n = this.nElectrons();
      const single = Math.min(5, n);
      const t2g = Math.min(3, single);
      const eg = single - t2g;
      let remaining = n - single;
      const pT = Math.min(3, remaining); const t2gF = t2g + pT; remaining -= pT;
      const egF = eg + Math.min(2, remaining);
      const levels = [
        { label: 'eg',  yEnergy: 0.85, nBoxes: 2, electrons: egF },
        { label: 't₂g', yEnergy: 0.4,  nBoxes: 3, electrons: t2gF },
      ];
      drawEnergyLevels(g, levels, cw / 2, ey, eh, 0, 1.2);
    }
    // Right: low-spin
    g.fillStyle = dist.lowSpin ? theme.crimson : theme.inkAlpha(0.7);
    g.fillText('low spin (Δ > P)', cw + cw / 2, ey - 8);
    {
      const n = this.nElectrons();
      const t2g = Math.min(6, n);
      const eg = n - t2g;
      const levels = [
        { label: 'eg',  yEnergy: 1.05, nBoxes: 2, electrons: eg },
        { label: 't₂g', yEnergy: 0.25, nBoxes: 3, electrons: t2g },
      ];
      drawEnergyLevels(g, levels, cw + cw / 2, ey, eh, 0, 1.2);
    }

    // Readout panel at bottom
    const ry = ey + eh + 30;
    g.fillStyle = theme.crimson; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`current configuration: ${dist.lowSpin ? 'LOW' : 'HIGH'} spin`, M, ry);
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText(`t₂g${dist.t2g} eg${dist.eg}  ·  unpaired electrons n = ${dist.unpaired}`, M, ry + 18);
    const mu = Math.sqrt(dist.unpaired * (dist.unpaired + 2));
    g.fillStyle = theme.inkAlpha(0.75); g.font = '12px serif';
    g.fillText(`magnetic moment μ_eff ≈ √(n(n+2)) = ${mu.toFixed(2)} BM`, M, ry + 36);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif';
    g.fillText('Examples: [Co(NH₃)₆]³⁺ low-spin diamagnetic; [CoF₆]³⁻ high-spin paramagnetic — same Co³⁺, different ligand field.', M, ry + 58);
  }
}

new LigandField();
