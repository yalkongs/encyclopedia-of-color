import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Form = 'DsRed' | 'mRFP' | 'mCherry';
const FORMS: Form[] = ['DsRed', 'mRFP', 'mCherry'];
const INFO: Record<Form, { n: number; brightness: number; rgb: [number, number, number]; note: string }> = {
  DsRed:   { n: 4, brightness: 0.4, rgb: [200, 50, 50],  note: 'tetramer — bad for fusions' },
  mRFP:    { n: 1, brightness: 0.3, rgb: [200, 60, 60],  note: 'first monomer, but dim' },
  mCherry: { n: 1, brightness: 0.85, rgb: [220, 40, 70], note: 'monomer + bright + photostable' },
};

class RFP {
  private stage: CanvasStage;
  private form: Form = 'mCherry';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('form');
    if (raw && (FORMS as string[]).includes(raw)) this.form = raw as Form;
    const t = document.getElementById('form') as EncToggle; t.value = this.form;
    t.addEventListener('change', (e) => { this.form = (e as CustomEvent).detail.value as Form; this.draw(); notifyStateChange(); });
    registerStateParam('form', () => this.form);
    document.addEventListener('reset-params', () => { this.form = 'mCherry'; t.value = 'mCherry'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.form];
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.form} · ${i.n}-mer · brightness ${i.brightness.toFixed(2)} · ${i.note}`, M, M);

    const cx = w / 2, cy = h / 2;
    if (i.n === 4) {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 - Math.PI / 4;
        const x = cx + Math.cos(a) * 60, y = cy + Math.sin(a) * 60;
        g.fillStyle = `rgba(${i.rgb[0]},${i.rgb[1]},${i.rgb[2]},${0.5 + i.brightness * 0.4})`;
        g.beginPath(); g.arc(x, y, 50, 0, Math.PI * 2); g.fill();
        g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
      }
    } else {
      g.fillStyle = `rgba(${i.rgb[0]},${i.rgb[1]},${i.rgb[2]},${0.6 + i.brightness * 0.4})`;
      g.beginPath(); g.arc(cx, cy, 80, 0, Math.PI * 2); g.fill();
      g.strokeStyle = theme.inkAlpha(0.5); g.stroke();
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Directed-evolution success story — the "mFruit" series (mCherry, mPlum, mOrange) covers the spectrum, all monomeric.', M, h - M);
  }
}

new RFP();
