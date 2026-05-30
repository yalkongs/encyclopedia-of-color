import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';
import { wavelengthCss } from '@core/render/molecular';

type Env = 'soluble' | 'protein-bound';
const ENVS: Env[] = ['soluble', 'protein-bound'];
const INFO: Record<Env, { lambda: number; colour: [number, number, number] }> = {
  soluble:       { lambda: 440, colour: [220, 180, 100] },
  'protein-bound': { lambda: 570, colour: [130, 60, 180] },
};

class BR {
  private stage: CanvasStage;
  private env: Env = 'protein-bound';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('env');
    if (raw && (ENVS as string[]).includes(raw)) this.env = raw as Env;
    const t = document.getElementById('env') as EncToggle; t.value = this.env;
    t.addEventListener('change', (e) => { this.env = (e as CustomEvent).detail.value as Env; this.draw(); notifyStateChange(); });
    registerStateParam('env', () => this.env);
    document.addEventListener('reset-params', () => { this.env = 'protein-bound'; t.value = 'protein-bound'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.env];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`retinal · ${this.env} · λ_max = ${i.lambda} nm`, M, M);

    // Halobacterium cell schematic
    const cx = M + 130, cy = M + 150, r = 80;
    g.fillStyle = `rgb(${i.colour[0]},${i.colour[1]},${i.colour[2]})`;
    g.beginPath(); g.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 2; g.stroke();
    g.fillStyle = theme.inkAlpha(0.8); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Halobacterium cell', cx, cy + r * 0.6 + 16);

    // Spectrum strip
    const sx = M + 280, sy = M + 60, sw = w - sx - M, sh = 80;
    for (let i2 = 0; i2 < sw; i2++) {
      const lam = 380 + (i2 / sw) * 320;
      g.fillStyle = wavelengthCss(lam);
      g.fillRect(sx + i2, sy, 1, sh);
    }
    const sigma = 40;
    for (let i2 = 0; i2 < sw; i2++) {
      const lam = 380 + (i2 / sw) * 320;
      const a = Math.exp(-Math.pow((lam - i.lambda) / sigma, 2));
      if (a > 0.02) { g.fillStyle = `rgba(0,0,0,${a * 0.85})`; g.fillRect(sx + i2, sy, 1, sh); }
    }
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy, sw, sh);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Same retinal chromophore used in your rod cells (~500 nm) and bacteriorhodopsin (570 nm) — opsin protein shifts the colour by tuning the binding pocket.', M, h - M);
  }
}

new BR();
