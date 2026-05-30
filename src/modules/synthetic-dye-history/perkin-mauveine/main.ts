import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

interface Dye { year: number; name: string; col: string; }

const DYES: Dye[] = [
  { year: 1856, name: 'mauveine', col: '#8a4a9a' },
  { year: 1858, name: 'fuchsine', col: '#c2386a' },
  { year: 1859, name: 'magenta', col: '#a82066' },
  { year: 1862, name: 'aniline yellow', col: '#d8c020' },
  { year: 1863, name: 'Bismarck brown', col: '#6a3a18' },
  { year: 1868, name: 'alizarin (synth)', col: '#c2382c' },
  { year: 1869, name: 'malachite green', col: '#0c8a5a' },
  { year: 1880, name: 'indigo (synth)', col: '#1f3a8a' },
  { year: 1884, name: 'Congo red', col: '#a82828' },
  { year: 1893, name: 'rhodamine B', col: '#e02080' },
  { year: 1897, name: 'sulfur blacks', col: '#1a1a1a' },
];

class Mauveine {
  private stage: CanvasStage;
  private y = 1856;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.y = hydrateNumber('y', 1856);
    const s = document.getElementById('y') as EncSlider; s.value = this.y;
    s.addEventListener('input', (e) => { this.y = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('y', () => Math.round(this.y));
    document.addEventListener('reset-params', () => { this.y = 1856; s.value = 1856; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const year = Math.round(this.y);
    const known = DYES.filter(d => d.year <= year);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Year ${year} · ${known.length} synthetic coal-tar dyes discovered`, M, M);

    // Timeline strip
    const tx = M, ty = M + 30, tw = w - 2 * M, th = 22;
    g.fillStyle = '#f0e6d4'; g.fillRect(tx, ty, tw, th);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(tx, ty, tw, th);
    for (const d of DYES) {
      const x = tx + ((d.year - 1856) / (1900 - 1856)) * tw;
      g.strokeStyle = theme.inkAlpha(d.year <= year ? 0.7 : 0.3);
      g.beginPath(); g.moveTo(x, ty); g.lineTo(x, ty + th); g.stroke();
    }
    // Cursor
    const cx = tx + ((year - 1856) / 44) * tw;
    g.strokeStyle = theme.crimson; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, ty - 4); g.lineTo(cx, ty + th + 4); g.stroke();
    g.fillStyle = theme.inkAlpha(0.7); g.font = '10px serif'; g.textAlign = 'left';
    g.fillText('1856', tx, ty + th + 14);
    g.textAlign = 'right'; g.fillText('1900', tx + tw, ty + th + 14);

    // Dye palette grid (cumulative swatches)
    const gx = tx, gy = ty + 50, sw = 64, sh = 64, gap = 10;
    const cols = Math.floor((tw + gap) / (sw + gap));
    for (let i = 0; i < DYES.length; i++) {
      const d = DYES[i];
      const r = Math.floor(i / cols), c = i % cols;
      const x = gx + c * (sw + gap), yy = gy + r * (sh + 36);
      if (d.year <= year) {
        g.fillStyle = d.col; g.fillRect(x, yy, sw, sh);
        g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(x, yy, sw, sh);
        // weave
        g.strokeStyle = 'rgba(0,0,0,0.1)';
        for (let k = 0; k < sw; k += 4) { g.beginPath(); g.moveTo(x + k, yy); g.lineTo(x + k, yy + sh); g.stroke(); }
      } else {
        g.fillStyle = '#e8e8e8'; g.fillRect(x, yy, sw, sh);
        g.strokeStyle = theme.inkAlpha(0.3); g.setLineDash([3, 3]); g.strokeRect(x, yy, sw, sh); g.setLineDash([]);
      }
      g.fillStyle = d.year <= year ? theme.ink : theme.inkAlpha(0.4);
      g.font = '10px serif'; g.textAlign = 'center';
      g.fillText(`${d.year}`, x + sw / 2, yy + sh + 12);
      g.fillText(d.name, x + sw / 2, yy + sh + 24);
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Perkin patented mauveine at age 18, retired wealthy at 36, and reshaped Germany\'s industrial chemistry into the world\'s leading dye industry.', M, h - M);
  }
}

new Mauveine();
