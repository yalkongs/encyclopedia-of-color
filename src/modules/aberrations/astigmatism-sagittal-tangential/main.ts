import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const F_TAN = -20; // tangential focal-line position (px relative to ideal image plane)
const F_SAG = 20;  // sagittal focal-line position

class Astig {
  private stage: CanvasStage;
  private z = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.z = hydrateNumber('z', 0);
    const s = document.getElementById('z') as EncSlider; s.value = this.z;
    s.addEventListener('input', (e) => { this.z = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('z', () => Math.round(this.z));
    document.addEventListener('reset-params', () => { this.z = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;

    let label = '';
    if (Math.abs(this.z - F_TAN) < 3) label = 'tangential focal line (vertical streak)';
    else if (Math.abs(this.z - F_SAG) < 3) label = 'sagittal focal line (horizontal streak)';
    else if (Math.abs(this.z) < 3) label = '← circle of least confusion';
    else label = 'intermediate elliptical blur';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`image plane z=${this.z}  ·  ${label}`, M, M);

    // 1D axis: positions of the two foci
    const ax = M + 100, ay = M + 60, aw = w - 2 * M - 100;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + aw, ay); g.stroke();
    const X = (z: number) => ax + ((z + 50) / 100) * aw;
    g.fillStyle = '#c2382c';
    g.beginPath(); g.arc(X(F_TAN), ay, 6, 0, Math.PI * 2); g.fill();
    g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('tangential', X(F_TAN), ay - 12);
    g.fillStyle = '#3a76a8';
    g.beginPath(); g.arc(X(F_SAG), ay, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a76a8'; g.fillText('sagittal', X(F_SAG), ay - 12);
    g.fillStyle = '#888'; g.beginPath(); g.arc(X(0), ay, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#888'; g.fillText('LCC', X(0), ay + 18);
    // Current marker
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(X(this.z), ay - 14); g.lineTo(X(this.z), ay + 24); g.stroke();

    // Blur visualisation
    const bx = M + 80, by = M + 130, bs = 240;
    g.fillStyle = '#1a1a1a'; g.fillRect(bx, by, bs, bs);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(bx, by, bs, bs);
    // Compute ellipse: at z=F_TAN it's a vertical line; at z=F_SAG a horizontal line;
    // at LCC (z=0) it's a circle of moderate radius
    const dx_tan = Math.abs(this.z - F_TAN), dx_sag = Math.abs(this.z - F_SAG);
    const rH = dx_tan * 1.5; // horizontal radius grows with distance from tangential focus
    const rV = dx_sag * 1.5; // vertical radius grows with distance from sagittal focus
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(bx + bs / 2, by + bs / 2, Math.max(2, rH), Math.max(2, rV), 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff'; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('PSF at current z (image-plane view)', bx + bs / 2, by + bs + 18);

    // Side-view ray bundle (right of square)
    const ex = bx + bs + 40, ey = by + bs / 2, ew = w - ex - M;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1;
    // Axis
    g.strokeStyle = theme.inkAlpha(0.4); g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + ew, ey); g.stroke(); g.setLineDash([]);
    // Tangential focus marker
    const tfX = ex + ew * 0.25;
    g.strokeStyle = '#c2382c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(tfX, ey - 30); g.lineTo(tfX, ey + 30); g.stroke();
    // Sagittal focus marker
    const sfX = ex + ew * 0.75;
    g.strokeStyle = '#3a76a8';
    g.beginPath(); g.moveTo(sfX - 30, ey); g.lineTo(sfX + 30, ey); g.stroke();
    // Bundle envelopes
    g.strokeStyle = 'rgba(190,60,40,0.4)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(ex, ey - 50); g.lineTo(tfX, ey); g.lineTo(sfX, ey + 50); g.lineTo(ex + ew, ey - 20); g.stroke();
    g.beginPath(); g.moveTo(ex, ey + 50); g.lineTo(tfX, ey); g.lineTo(sfX, ey - 50); g.lineTo(ex + ew, ey + 20); g.stroke();
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('tangential ⊥', tfX, ey - 40);
    g.fillStyle = theme.ink;
    g.fillText('sagittal —', sfX, ey + 60);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Anastigmat lenses (1890s) eliminate astigmatism by careful element placement. Cylindrical glasses correct ocular astigmatism.', M, h - M);
  }
}

new Astig();
