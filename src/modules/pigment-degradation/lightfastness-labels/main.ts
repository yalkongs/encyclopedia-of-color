import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Cls = 'I' | 'II' | 'III' | 'IV' | 'V';
const CLASSES: Cls[] = ['I', 'II', 'III', 'IV', 'V'];
const INFO: Record<Cls, { label: string; years: string; examples: string[]; sampleRGB: [number, number, number]; fadeFrac: number }> = {
  I:   { label: 'Excellent (>100 y)',     years: '>100',  examples: ['cadmium red',  'cobalt blue', 'titanium white', 'ivory black'], sampleRGB: [200, 30, 30],  fadeFrac: 0.97 },
  II:  { label: 'Very good (50-100 y)',   years: '50-100',examples: ['phthalo blue', 'phthalo green', 'cerulean blue'],                  sampleRGB: [20, 100, 180], fadeFrac: 0.85 },
  III: { label: 'Fair (15-50 y)',         years: '15-50', examples: ['quinacridone', 'naphthol red'],                                     sampleRGB: [180, 60, 90],  fadeFrac: 0.55 },
  IV:  { label: 'Poor (2-15 y)',          years: '2-15',  examples: ['alizarin crimson', 'aureolin'],                                     sampleRGB: [170, 50, 70],  fadeFrac: 0.30 },
  V:   { label: 'Fugitive (<2 y)',        years: '<2',    examples: ['eosin', 'Indian yellow', 'gamboge', 'crystal violet'],              sampleRGB: [220, 90, 120], fadeFrac: 0.05 },
};

class LightfastClass {
  private stage: CanvasStage;
  private cls: Cls = 'I';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('cls');
    if (raw && (CLASSES as string[]).includes(raw)) this.cls = raw as Cls;
    const t = document.getElementById('cls') as EncToggle; t.value = this.cls;
    t.addEventListener('change', (e) => { this.cls = (e as CustomEvent).detail.value as Cls; this.draw(); notifyStateChange(); });
    registerStateParam('cls', () => this.cls);
    document.addEventListener('reset-params', () => { this.cls = 'I'; t.value = 'I'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const i = INFO[this.cls];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`ASTM lightfastness ${this.cls} — ${i.label}`, M, M);

    // Five classes side-by-side as comparison strip
    const sy = M + 30;
    const sh = 90;
    const sw = (w - 6 * M) / 5;
    let cx = M;
    for (const c of CLASSES) {
      const info2 = INFO[c];
      g.fillStyle = `rgb(${info2.sampleRGB[0]},${info2.sampleRGB[1]},${info2.sampleRGB[2]})`;
      g.fillRect(cx, sy, sw, sh);
      g.strokeStyle = c === this.cls ? theme.crimson : theme.inkAlpha(0.5);
      g.lineWidth = c === this.cls ? 2.5 : 1;
      g.strokeRect(cx, sy, sw, sh);
      g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'center';
      g.fillText(c, cx + sw / 2, sy + sh + 18);
      g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif';
      g.fillText(info2.years + ' y', cx + sw / 2, sy + sh + 32);
      cx += sw + M;
    }

    // Below: 50-year fade comparison for the active class
    const fy = sy + sh + 60;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`after 50 years museum lighting (~150 lux × 8 h/day):`, M, fy);
    // Before
    g.fillStyle = `rgb(${i.sampleRGB[0]},${i.sampleRGB[1]},${i.sampleRGB[2]})`;
    g.fillRect(M, fy + 12, 200, 80);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(M, fy + 12, 200, 80);
    g.fillStyle = theme.ink; g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('day 0', M + 100, fy + 108);
    // After
    const ret = Math.pow(i.fadeFrac, 1); // 50-year accumulated
    const fadedR = i.sampleRGB[0] * ret + 240 * (1 - ret);
    const fadedG = i.sampleRGB[1] * ret + 235 * (1 - ret);
    const fadedB = i.sampleRGB[2] * ret + 230 * (1 - ret);
    g.fillStyle = `rgb(${Math.round(fadedR)},${Math.round(fadedG)},${Math.round(fadedB)})`;
    g.fillRect(M + 220, fy + 12, 200, 80);
    g.strokeRect(M + 220, fy + 12, 200, 80);
    g.fillText(`50 yr · ${(ret * 100).toFixed(0)}% retained`, M + 320, fy + 108);

    // Examples list on the right
    const ex = M + 460;
    g.fillStyle = theme.ink; g.font = '13px serif'; g.textAlign = 'left';
    g.fillText(`typical pigments rated ASTM ${this.cls}:`, ex, fy);
    g.fillStyle = theme.inkAlpha(0.85); g.font = '12px serif';
    for (let k = 0; k < i.examples.length; k++) {
      g.fillText(`· ${i.examples[k]}`, ex, fy + 26 + k * 18);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Look for the ASTM number on professional artist paint tubes. Many "student grade" paints skip the rating — they are usually classes III-V.', M, h - M);
  }
}

new LightfastClass();
