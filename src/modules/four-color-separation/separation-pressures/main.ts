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

class Registration {
  private stage: CanvasStage;
  private offset = 4;
  private trap = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.offset = hydrateNumber('offset', 4);
    this.trap = hydrateFromUrl('trap') ?? 'off';
    const s = document.getElementById('offset') as EncSlider;
    s.value = this.offset;
    s.addEventListener('input', (e) => { this.offset = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('offset', () => Math.round(this.offset));
    const t = document.getElementById('trap') as EncToggle;
    t.value = this.trap;
    t.addEventListener('change', (e) => { this.trap = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('trap', () => this.trap);
    document.addEventListener('reset-params', () => { this.offset = 4; this.trap = 'off'; s.value = 4; t.value = 'off'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const x0 = 40, y0 = 40, x1 = w - 40, y1 = h - 64, gw = x1 - x0, gh = y1 - y0;
    const mid = x0 + gw * 0.5, off = this.offset, trap = this.trap === 'on' ? Math.max(off + 1, 3) : 0;

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // Magenta right field (stationary), spread left by trap toward the seam
    ctx.fillStyle = '#ec008c';
    ctx.fillRect(mid - trap, y0, x1 - (mid - trap), gh);
    // Cyan left field, shifted LEFT off-register by `off`; spread right by trap
    ctx.fillStyle = '#00aeef';
    ctx.fillRect(x0 - off, y0, (mid + trap) - x0, gh);
    // Yellow accent disc straddling the seam (stationary)
    ctx.fillStyle = '#fff200';
    ctx.beginPath(); ctx.arc(mid, y0 + gh * 0.5, gh * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Black keyline ring on the yellow disc — the K plate stays in register while cyan drifts
    ctx.strokeStyle = '#231f20'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(mid, y0 + gh * 0.5, gh * 0.24, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, gw, gh);
    // seam guide
    ctx.strokeStyle = theme.inkAlpha(0.25); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(mid, y0); ctx.lineTo(mid, y1); ctx.stroke(); ctx.setLineDash([]);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(this.trap === 'on'
      ? `trapping on — cyan and magenta overlap by ${trap}px, so the ${off}px misregister shows no white`
      : (off === 0 ? 'in register — colours meet cleanly at the seam' : `${off}px off-register — a white sliver cracks open and the keyline drifts off its fill`), w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Registration());
