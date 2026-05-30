import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class Grue {
  private stage: CanvasStage;
  private lang: 'English' | 'Welsh-glas' = 'Welsh-glas';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    const raw = hydrateFromUrl('lang');
    if (raw === 'English' || raw === 'Welsh-glas') this.lang = raw;
    const t = document.getElementById('lang') as EncToggle; t.value = this.lang;
    t.addEventListener('change', (e) => { this.lang = (e as CustomEvent).detail.value as 'English' | 'Welsh-glas'; this.draw(); notifyStateChange(); });
    registerStateParam('lang', () => this.lang);
    document.addEventListener('reset-params', () => { this.lang = 'Welsh-glas'; t.value = 'Welsh-glas'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${this.lang === 'Welsh-glas' ? 'Welsh "glas"' : 'English'} colour vocabulary`, M, M);

    // Grass and sky as test stimuli
    const sx = M + 30, sy = M + 50;
    const sw = (w - 3 * M) / 2, sh = 200;
    g.fillStyle = '#5aa050'; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = '#fff'; g.font = '14px serif'; g.textAlign = 'center';
    g.fillText(this.lang === 'Welsh-glas' ? 'glas' : 'green', sx + sw / 2, sy + 30);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('grass', sx + sw / 2, sy + sh + 14);

    const bx = sx + sw + M;
    g.fillStyle = '#6090c8'; g.fillRect(bx, sy, sw, sh);
    g.strokeRect(bx, sy, sw, sh);
    g.fillStyle = '#fff'; g.font = '14px serif';
    g.fillText(this.lang === 'Welsh-glas' ? 'glas' : 'blue', bx + sw / 2, sy + 30);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText('sky', bx + sw / 2, sy + sh + 14);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Welsh "glas" covers blue and green together — also Vietnamese xanh, Korean classical 푸르다, Tarahumara siyóname.', M, h - M);
  }
}

new Grue();
