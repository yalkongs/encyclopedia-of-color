import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

type Stream = 'color' | 'form' | 'motion';
const ROWS: Stream[] = ['color', 'form', 'motion'];
const LABELS: Record<Stream, [string, string, string]> = {
  color: ['V1 blobs', 'V2 thin stripe', 'V4'],
  form: ['V1 interblob', 'V2 pale stripe', 'IT'],
  motion: ['V1 layer 4B', 'V2 thick stripe', 'MT'],
};
const ACCENT: Record<Stream, string> = { color: theme.crimson, form: theme.goldDeep, motion: theme.slate };

class BlobStripe {
  private stage: CanvasStage;
  private stream: Stream = 'color';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.stream = (hydrateFromUrl('stream') as Stream) ?? 'color';
    (document.getElementById('stream') as EncToggle).value = this.stream;
    registerStateParam('stream', () => this.stream);
    (document.getElementById('stream') as EncToggle).addEventListener('change', (e) => {
      this.stream = (e as CustomEvent).detail.value; this.draw(); notifyStateChange();
    });
    document.addEventListener('reset-params', () => {
      this.stream = 'color';
      (document.getElementById('stream') as EncToggle).value = 'color';
      this.draw(); notifyStateChange();
    });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.clearRect(0, 0, w, h);

    const colX = [w * 0.17, w * 0.5, w * 0.83];
    const rowY = [h * 0.32, h * 0.52, h * 0.72];
    const bw = Math.min(120, w * 0.2), bh = 34;

    // Column headers.
    ctx.fillStyle = theme.inkMute; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ['V1', 'V2', 'extrastriate'].forEach((t, i) => ctx.fillText(t, colX[i], h * 0.18));

    // Connecting arrows (active row bold, others faint), drawn first.
    ROWS.forEach((s, r) => {
      const active = s === this.stream;
      ctx.strokeStyle = active ? ACCENT[s] : theme.inkAlpha(0.15);
      ctx.lineWidth = active ? 2.4 : 1;
      for (let c = 0; c < 2; c++) {
        const x1 = colX[c] + bw / 2, x2 = colX[c + 1] - bw / 2, y = rowY[r];
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        if (active) {
          ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 7, y - 4); ctx.lineTo(x2 - 7, y + 4); ctx.closePath();
          ctx.fillStyle = ACCENT[s]; ctx.fill();
        }
      }
    });

    // Nodes.
    ctx.font = '12px Inter, sans-serif';
    ROWS.forEach((s, r) => {
      const active = s === this.stream;
      for (let c = 0; c < 3; c++) {
        const x = colX[c] - bw / 2, y = rowY[r] - bh / 2;
        ctx.fillStyle = active ? ACCENT[s] : theme.paperRecess;
        ctx.globalAlpha = active ? 0.16 : 1;
        ctx.fillRect(x, y, bw, bh);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = active ? ACCENT[s] : theme.inkAlpha(0.3); ctx.lineWidth = active ? 1.8 : 1;
        ctx.strokeRect(x, y, bw, bh);
        ctx.fillStyle = active ? ACCENT[s] : theme.inkHint; ctx.textAlign = 'center';
        ctx.fillText(LABELS[s][c], colX[c], rowY[r] + 4);
      }
    });

    // Stream label.
    ctx.fillStyle = ACCENT[this.stream]; ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    const tag: Record<Stream, string> = {
      color: 'colour stream — blobs carry wavelength, not edges',
      form: 'form stream — interblobs carry orientation and shape',
      motion: 'motion stream — fast, achromatic, direction-selective',
    };
    ctx.fillText(tag[this.stream], w / 2, h * 0.9);
    ctx.textAlign = 'left';
  }
}
window.addEventListener('DOMContentLoaded', () => new BlobStripe());
