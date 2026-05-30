import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

const LAM_CUT = 1127;

function qe(lambda: number, bsi: boolean): number {
  if (lambda >= LAM_CUT) return 0;
  if (lambda < 200) return 0;
  // visible/NIR plateau with sharp wall at bandgap; UV roll-off below 350
  const peak = bsi ? 0.86 : 0.62;
  const env = peak * Math.exp(-Math.pow((lambda - 600) / 320, 2));
  const uv = lambda < 350 ? Math.exp(-Math.pow((350 - lambda) / 60, 2)) : 1;
  const ir = lambda > 950 ? Math.max(0, 1 - (lambda - 950) / (LAM_CUT - 950)) : 1;
  return Math.max(0, env * uv * ir);
}

class SensorQE {
  private stage: CanvasStage;
  private bsi = 'fsi';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.bsi = hydrateFromUrl('bsi') ?? 'fsi';
    const t = document.getElementById('bsi') as EncToggle;
    t.value = this.bsi;
    t.addEventListener('change', (e) => { this.bsi = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('bsi', () => this.bsi);
    document.addEventListener('reset-params', () => { this.bsi = 'fsi'; t.value = 'fsi'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const isBsi = this.bsi === 'bsi';
    const gx = 64, gy = 40, gw = w - 110, gh = h - 110;
    const Xl = 200, Xr = 1200;
    const X = (l: number) => gx + ((l - Xl) / (Xr - Xl)) * gw;
    const Y = (q: number) => gy + gh - q * gh;

    // shaded regions (UV / VIS / NIR / past bandgap)
    const fill = (l0: number, l1: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(X(l0), gy, X(l1) - X(l0), gh); };
    fill(200, 380, 'rgba(120,80,180,0.10)');
    fill(380, 780, 'rgba(255,210,80,0.10)');
    fill(780, LAM_CUT, 'rgba(220,80,80,0.08)');
    fill(LAM_CUT, Xr, 'rgba(40,40,50,0.15)');

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1;
    for (let l = 200; l <= 1200; l += 100) { ctx.beginPath(); ctx.moveTo(X(l), gy); ctx.lineTo(X(l), gy + gh); ctx.stroke(); }
    for (let i = 0; i <= 10; i++) { const y = gy + (i / 10) * gh; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    // QE curve
    ctx.strokeStyle = isBsi ? theme.gold : theme.crimson; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let l = 200; l <= 1200; l += 2) { const x = X(l), y = Y(qe(l, isBsi)); l === 200 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();

    // bandgap cutoff
    ctx.strokeStyle = '#9b2828'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(X(LAM_CUT), gy); ctx.lineTo(X(LAM_CUT), gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#9b2828'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Si bandgap ≈ ${LAM_CUT} nm`, X(LAM_CUT) + 6, gy + 14);
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('past here a photon has < 1.1 eV — too weak to free an electron', X(LAM_CUT) + 6, gy + 30);

    // axis labels and region tags
    ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let l = 200; l <= 1200; l += 100) ctx.fillText(`${l}`, X(l), gy + gh + 14);
    ctx.fillText('wavelength (nm)', gx + gw / 2, gy + gh + 30);
    ctx.save(); ctx.translate(gx - 38, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('quantum efficiency', 0, 0); ctx.restore();
    ctx.fillText('UV', (X(200) + X(380)) / 2, gy + 14);
    ctx.fillText('visible', (X(380) + X(780)) / 2, gy + 14);
    ctx.fillText('near-IR', (X(780) + X(LAM_CUT)) / 2, gy + 14);
    ctx.fillText('blind', (X(LAM_CUT) + X(Xr)) / 2, gy + 14);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(isBsi
      ? 'back-side illuminated — wiring moved behind the silicon; peak around 85%'
      : 'front-side illuminated — wiring sits over the photodiode; peak around 60%', w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new SensorQE());
