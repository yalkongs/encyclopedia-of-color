import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Type = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
const TYPES: Type[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const INFO: Record<Type, { rgb: [number, number, number]; burn: string; tan: string }> = {
  I:   { rgb: [248, 226, 212], burn: 'always',   tan: 'never' },
  II:  { rgb: [232, 198, 172], burn: 'usually',  tan: 'minimally' },
  III: { rgb: [210, 170, 140], burn: 'sometimes',tan: 'gradually' },
  IV:  { rgb: [180, 130, 100], burn: 'rarely',   tan: 'easily' },
  V:   { rgb: [130, 90, 60],   burn: 'very rarely', tan: 'deeply' },
  VI:  { rgb: [80, 50, 30],    burn: 'never',    tan: 'always dark' },
};

class Fitzpatrick {
  private stage: CanvasStage;
  private t: Type = 'III';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('t');
    if (raw && (TYPES as string[]).includes(raw)) this.t = raw as Type;
    const tg = document.getElementById('t') as EncToggle; tg.value = this.t;
    tg.addEventListener('change', (e) => { this.t = (e as CustomEvent).detail.value as Type; this.draw(); notifyStateChange(); });
    registerStateParam('t', () => this.t);
    document.addEventListener('reset-params', () => { this.t = 'III'; tg.value = 'III'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.t];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Fitzpatrick type ${this.t} · burn: ${i.burn} · tan: ${i.tan}`, M, M);

    // Six swatches
    const sy = M + 40;
    const sw = (w - 7 * M) / 6;
    const sh = 140;
    let cx = M;
    for (const tt of TYPES) {
      const info = INFO[tt];
      g.fillStyle = `rgb(${info.rgb[0]},${info.rgb[1]},${info.rgb[2]})`;
      g.fillRect(cx, sy, sw, sh);
      g.strokeStyle = tt === this.t ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = tt === this.t ? 2.5 : 1;
      g.strokeRect(cx, sy, sw, sh);
      g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'center';
      g.fillText(tt, cx + sw / 2, sy + sh + 18);
      cx += sw + M;
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Modern dermatology supplements Fitzpatrick with eumelanin-quantitative spectrophotometry — the binary I/VI classification has limits.', M, h - M);
  }
}

new Fitzpatrick();
