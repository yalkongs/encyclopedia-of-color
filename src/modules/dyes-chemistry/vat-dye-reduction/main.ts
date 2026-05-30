import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Stg = 'oxidised' | 'reduced' | 're-oxidised';
const STAGES: Stg[] = ['oxidised', 'reduced', 're-oxidised'];

const INFO: Record<Stg, { form: string; lambda: number; vatRGB: [number, number, number]; fabricRGB: [number, number, number]; note: string }> = {
  oxidised:     { form: 'indigo (quinone, insoluble)', lambda: 610, vatRGB: [40, 50, 110],  fabricRGB: [220, 215, 210], note: 'before reduction — insoluble blue powder, cannot enter fibre' },
  reduced:      { form: 'leuco-indigo (yellow, soluble)', lambda: 400, vatRGB: [200, 200, 80], fabricRGB: [210, 200, 130], note: 'after Na₂S₂O₄ — soluble enol form, soaks into cotton' },
  're-oxidised':{ form: 'indigo (quinone, trapped)', lambda: 610, vatRGB: [200, 200, 80],  fabricRGB: [45, 60, 130],   note: 'after air exposure — leuco re-oxidises in situ → indigo trapped inside fibre' },
};

class VatDye {
  private stage: CanvasStage;
  private st: Stg = 'reduced';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('vstage');
    if (raw && (STAGES as string[]).includes(raw)) this.st = raw as Stg;
    const t = document.getElementById('vstage') as EncToggle; t.value = this.st;
    t.addEventListener('change', (e) => { this.st = (e as CustomEvent).detail.value as Stg; this.draw(); notifyStateChange(); });
    registerStateParam('vstage', () => this.st);
    document.addEventListener('reset-params', () => { this.st = 'reduced'; t.value = 'reduced'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.st];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`stage = ${this.st} · ${i.form} · λ_max ≈ ${i.lambda} nm`, M, M);

    // Vat (left) and fabric (right) panels
    const py = M + 50;
    const ph = 240;
    const pwHalf = (w - 3 * M) / 2;

    // Vat
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'center';
    g.fillText('dye vat', M + pwHalf / 2, py - 6);
    g.fillStyle = `rgb(${i.vatRGB[0]},${i.vatRGB[1]},${i.vatRGB[2]})`;
    g.fillRect(M, py, pwHalf, ph);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, py, pwHalf, ph);

    // Fabric
    g.fillStyle = theme.ink; g.font = '12px serif';
    g.fillText('cotton fabric', M * 2 + pwHalf + pwHalf / 2, py - 6);
    g.fillStyle = `rgb(${i.fabricRGB[0]},${i.fabricRGB[1]},${i.fabricRGB[2]})`;
    g.fillRect(M * 2 + pwHalf, py, pwHalf, ph);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M * 2 + pwHalf, py, pwHalf, ph);

    // Stage timeline (3 boxes)
    const ty = py + ph + 30;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText('vat dyeing sequence:', M, ty);
    const tw = (w - 4 * M) / 3;
    let cx = M;
    const order: Stg[] = ['oxidised', 'reduced', 're-oxidised'];
    for (let k = 0; k < 3; k++) {
      const st = order[k];
      const info2 = INFO[st];
      const active = st === this.st;
      g.fillStyle = `rgb(${info2.vatRGB[0]},${info2.vatRGB[1]},${info2.vatRGB[2]})`;
      g.fillRect(cx, ty + 10, tw, 50);
      g.strokeStyle = active ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = active ? 2.5 : 1;
      g.strokeRect(cx, ty + 10, tw, 50);
      g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
      g.fillText(`(${k + 1}) ${st}`, cx + tw / 2, ty + 76);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
      const labels: Record<Stg, string> = {
        oxidised: 'add Na₂S₂O₄ →',
        reduced: 'soak fabric, then expose to air →',
        're-oxidised': '(end — fabric is permanently blue)',
      };
      g.fillText(labels[st], cx + tw / 2, ty + 90);
      cx += tw + M;
    }

    // Footnote
    g.fillStyle = theme.crimson; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText(i.note, M, h - M - 18);
    g.fillStyle = theme.inkAlpha(0.6); g.font = '11px serif';
    g.fillText('Tyrian purple (6,6\'-dibromoindigo) followed the same vat chemistry in antiquity.', M, h - M);
  }
}

new VatDye();
