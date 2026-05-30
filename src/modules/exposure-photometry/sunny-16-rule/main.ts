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

type Cond = 'sun' | 'overcast-light' | 'overcast' | 'heavy' | 'shade';
const CONDS: Cond[] = ['sun', 'overcast-light', 'overcast', 'heavy', 'shade'];
const COND_INFO: Record<Cond, { label: string; stopsOpen: number; aperture: string }> = {
  'sun':            { label: 'bright direct sun',        stopsOpen: 0, aperture: 'f/16' },
  'overcast-light': { label: 'slight overcast / hazy',   stopsOpen: 1, aperture: 'f/11' },
  'overcast':       { label: 'overcast',                  stopsOpen: 2, aperture: 'f/8' },
  'heavy':          { label: 'heavy overcast',            stopsOpen: 3, aperture: 'f/5.6' },
  'shade':          { label: 'open shade / sunset',       stopsOpen: 4, aperture: 'f/4' },
};

class Sunny16 {
  private stage: CanvasStage;
  private cond: Cond = 'sun';
  private iso = 100;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('cond');
    if (raw && (CONDS as string[]).includes(raw)) this.cond = raw as Cond;
    this.iso = hydrateNumber('iso', 100);

    const t = document.getElementById('cond') as EncToggle; t.value = this.cond;
    t.addEventListener('change', (e) => { this.cond = (e as CustomEvent).detail.value as Cond; this.draw(); notifyStateChange(); });

    const s = document.getElementById('iso') as EncSlider; s.value = this.iso;
    s.addEventListener('input', (e) => { this.iso = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });

    registerStateParam('cond', () => this.cond);
    registerStateParam('iso', () => Math.round(this.iso));

    document.addEventListener('reset-params', () => { this.cond = 'sun'; this.iso = 100; t.value = 'sun'; s.value = 100; this.draw(); notifyStateChange(); });
  }

  // Format shutter speed nicely (1/x or whole seconds)
  private fmtShutter(t: number): string {
    if (t >= 1) return `${t.toFixed(1)}s`;
    return `1/${Math.round(1 / t)}`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText('Sunny 16 — recipe table for every condition at the chosen ISO', M, M);

    // Table: condition / aperture / shutter
    const rows = CONDS;
    const colX = [M, M + 220, M + 380, M + 540];
    const rowY = M + 30;
    const rowH = 36;

    g.fillStyle = theme.inkAlpha(0.8); g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('condition', colX[0], rowY);
    g.fillText('stops open vs f/16', colX[1], rowY);
    g.fillText('aperture', colX[2], rowY);
    g.fillText(`shutter @ ISO ${this.iso}`, colX[3], rowY);
    g.strokeStyle = theme.inkAlpha(0.4); g.lineWidth = 1;
    g.beginPath(); g.moveTo(M, rowY + 6); g.lineTo(w - M, rowY + 6); g.stroke();

    // Sunny 16: shutter = 1/ISO at f/16; opening one stop halves shutter time
    for (let i = 0; i < rows.length; i++) {
      const info = COND_INFO[rows[i]];
      const y = rowY + 24 + i * rowH;
      const isActive = rows[i] === this.cond;
      if (isActive) {
        g.fillStyle = theme.inkAlpha(0.10); g.fillRect(M - 4, y - 18, w - 2 * M + 8, rowH);
      }
      g.fillStyle = isActive ? theme.crimson : theme.ink;
      g.font = '12px serif'; g.textAlign = 'left';
      g.fillText(info.label, colX[0], y);
      g.fillText(`${info.stopsOpen} stop${info.stopsOpen === 1 ? '' : 's'}`, colX[1], y);
      g.font = '12px monospace';
      g.fillText(info.aperture, colX[2], y);
      // Shutter at this condition: shutter = (1/ISO) / 2^stopsOpen
      // i.e., for each stop we open the aperture, we also need to halve the shutter to keep exposure constant
      const baseShutter = 1 / this.iso;
      const shutter = baseShutter / Math.pow(2, info.stopsOpen);
      g.fillText(this.fmtShutter(shutter), colX[3], y);
    }

    // Big readout for the active selection
    const ay = rowY + 24 + rows.length * rowH + 30;
    const active = COND_INFO[this.cond];
    const shutter = (1 / this.iso) / Math.pow(2, active.stopsOpen);
    g.fillStyle = theme.crimson; g.font = '14px serif';
    g.fillText('current recipe', M, ay);
    g.font = '28px serif'; g.fillStyle = theme.ink;
    g.fillText(`${active.aperture}  ·  ${this.fmtShutter(shutter)}  ·  ISO ${this.iso}`, M, ay + 32);

    // Exposure preview swatch
    const swY = ay + 60;
    g.fillStyle = theme.ink; g.font = '12px serif'; g.textAlign = 'left';
    g.fillText('exposed brightness should match between conditions (the recipe always lands on Zone V):', M, swY);
    const swH = 50;
    const swW = (w - 2 * M - (CONDS.length - 1) * 8) / CONDS.length;
    for (let i = 0; i < CONDS.length; i++) {
      // All "correctly exposed" → all the same grey
      const v = 138;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(M + i * (swW + 8), swY + 8, swW, swH);
      g.strokeStyle = CONDS[i] === this.cond ? theme.crimson : theme.inkAlpha(0.4);
      g.lineWidth = CONDS[i] === this.cond ? 2 : 1;
      g.strokeRect(M + i * (swW + 8), swY + 8, swW, swH);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(COND_INFO[CONDS[i]].label, M + i * (swW + 8) + swW / 2, swY + swH + 22);
    }
  }
}

new Sunny16();
