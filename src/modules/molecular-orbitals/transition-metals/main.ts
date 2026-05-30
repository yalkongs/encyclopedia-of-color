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
import { drawOctahedron, drawEnergyLevels, wavelengthCss } from '@core/render/molecular';

type DCount = 'd3' | 'd6' | 'd9';
const DS: DCount[] = ['d3', 'd6', 'd9'];

// Complement of wavelength: subtractive — find peak absorbance, observed colour is "white minus absorbed band"
function complementCss(absLambda: number): string {
  // Map absorbed-band to complementary band on the rough wavelength-to-colour ring
  const offsetTable: [number, number][] = [
    [400, 580], [430, 600], [450, 580], [490, 620], [520, 640], [550, 410], [580, 450], [610, 480], [640, 490], [700, 510],
  ];
  // Lerp between table entries
  for (let i = 0; i < offsetTable.length - 1; i++) {
    const [l0, c0] = offsetTable[i], [l1, c1] = offsetTable[i + 1];
    if (absLambda >= l0 && absLambda <= l1) {
      const t = (absLambda - l0) / (l1 - l0);
      return wavelengthCss(c0 + t * (c1 - c0));
    }
  }
  return wavelengthCss(550);
}

class TransitionMetals {
  private stage: CanvasStage;
  private dq = 20;          // cm⁻¹ × 10³ (so 20 → 20000 cm⁻¹)
  private d: DCount = 'd6';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.dq = hydrateNumber('dq', 20);
    const raw = hydrateFromUrl('d');
    if (raw && (DS as string[]).includes(raw)) this.d = raw as DCount;

    const sDq = document.getElementById('dq') as EncSlider; sDq.value = this.dq;
    sDq.addEventListener('input', (e) => { this.dq = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    const tD = document.getElementById('d') as EncToggle; tD.value = this.d;
    tD.addEventListener('change', (e) => { this.d = (e as CustomEvent).detail.value as DCount; this.draw(); notifyStateChange(); });

    registerStateParam('dq', () => Math.round(this.dq));
    registerStateParam('d', () => this.d);

    document.addEventListener('reset-params', () => {
      this.dq = 20; this.d = 'd6'; sDq.value = 20; tD.value = 'd6';
      this.draw(); notifyStateChange();
    });
  }

  private electronCount(): number {
    if (this.d === 'd3') return 3;
    if (this.d === 'd6') return 6;
    return 9;
  }

  private metalLabel(): string {
    if (this.d === 'd3') return 'Cr³⁺';
    if (this.d === 'd6') return 'Co³⁺';
    return 'Cu²⁺';
  }

  // High-spin electron distribution into t2g (3 boxes) and eg (2 boxes)
  // For d6 in strong field becomes low-spin; we treat dq as the controller.
  // P (pairing energy) ≈ 18 (cm⁻¹ × 10³) typical
  private distribution(): { t2g: number; eg: number; lowSpin: boolean } {
    const n = this.electronCount();
    const P = 18;
    const lowSpin = this.dq > P;
    // Maximum capacity: t2g 6, eg 4
    let t2g = 0, eg = 0;
    if (!lowSpin) {
      // High spin: fill all 5 boxes singly first, then pair up
      const single = Math.min(5, n);
      // Singles go: 3 to t2g, 2 to eg
      t2g = Math.min(3, single);
      eg = single - t2g;
      // Pairs after first 5
      let remaining = n - single;
      const pairTo = Math.min(3, remaining); t2g += pairTo; remaining -= pairTo;
      const pairEg = Math.min(2, remaining); eg += pairEg;
    } else {
      // Low spin: fill t2g first (paired)
      t2g = Math.min(6, n);
      eg = n - t2g;
    }
    return { t2g, eg, lowSpin };
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const dqCm = this.dq * 1000; // cm⁻¹
    const lambdaNm = 1e7 / dqCm; // nm (since 1/cm⁻¹ * 1e7 = nm)
    const photonEv = 1240 / lambdaNm;

    // Title
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.metalLabel()} (${this.d.toUpperCase()}) · Δ₀ = ${dqCm.toLocaleString()} cm⁻¹ = ${photonEv.toFixed(2)} eV · λ_abs ≈ ${lambdaNm.toFixed(0)} nm`, M, M);

    // Octahedron on the left
    const ocX = M + 110, ocY = M + 150;
    drawOctahedron(g, ocX, ocY, 80, this.metalLabel(), 'L');

    // Energy level diagram on the right
    const dist = this.distribution();
    const dXc = M + 320;
    const levels = [
      { label: 'eg', yEnergy: 0.6 + (this.dq - 10) / 25 * 0.3, nBoxes: 2, electrons: dist.eg },
      { label: 't₂g', yEnergy: 0.4 - (this.dq - 10) / 25 * 0.15, nBoxes: 3, electrons: dist.t2g },
    ];
    drawEnergyLevels(g, levels, dXc, M + 60, 180, 0, 1.2);

    // Spin readout
    g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(`${dist.lowSpin ? 'low-spin (Δ₀ > P)' : 'high-spin (Δ₀ < P)'} · t₂g=${dist.t2g}, eg=${dist.eg}`, dXc - 100, M + 256);

    // Absorption spectrum strip 380..780 nm with a Gaussian band at lambdaNm
    const sx = M, sw = w - 2 * M, sy = M + 300, sh = 50;
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('visible spectrum · absorption band at λ_abs', sx, sy - 6);
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 400;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i, sy, 1, sh);
    }
    // Absorption notch: black overlay with Gaussian alpha
    const sigma = 35;
    for (let i = 0; i < sw; i++) {
      const lam = 380 + (i / sw) * 400;
      const alpha = Math.exp(-Math.pow((lam - lambdaNm) / sigma, 2));
      if (alpha > 0.02) {
        g.fillStyle = `rgba(0,0,0,${alpha * 0.9})`;
        g.fillRect(sx + i, sy, 1, sh);
      }
    }
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = theme.crimson; g.font = '11px serif'; g.textAlign = 'center';
    const xLam = sx + ((lambdaNm - 380) / 400) * sw;
    g.fillText(`λ_abs = ${lambdaNm.toFixed(0)} nm`, Math.max(sx + 40, Math.min(sx + sw - 40, xLam)), sy + sh + 16);

    // Wavelength axis
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) {
      const lx = sx + ((l - 380) / 400) * sw;
      g.fillText(`${l}`, lx, sy + sh + 30);
    }

    // Observed colour swatch
    const obsY = sy + sh + 50;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('observed colour (complement of absorbed band):', sx, obsY);
    g.fillStyle = complementCss(lambdaNm);
    g.fillRect(sx + 320, obsY - 14, 80, 20);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx + 320, obsY - 14, 80, 20);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif';
    g.fillText('Δ₀ depends on metal, oxidation state, ligand. Strong-field ligands (CN⁻, CO) give large Δ₀; weak-field (Cl⁻, H₂O) give small Δ₀.', sx, obsY + 22);
  }
}

new TransitionMetals();
