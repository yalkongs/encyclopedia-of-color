import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncToggle } from '@core/components/toggle';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateFromUrl } from '@core/state/url-state';

class CmykWhyK {
  private stage: CanvasStage;
  private kink = 'off';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.kink = hydrateFromUrl('kink') ?? 'off';
    const t = document.getElementById('kink') as EncToggle;
    t.value = this.kink;
    t.addEventListener('change', (e) => { this.kink = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('kink', () => this.kink);
    document.addEventListener('reset-params', () => { this.kink = 'off'; t.value = 'off'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const useK = this.kink === 'on';

    // Venn of three discs in CMY, multiply composite; centre overlap reveals the brown limit
    const cx = w * 0.5, cy = h * 0.5 - 4, R = Math.min(w, h) * 0.18;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    // simulate ink that does not absorb perfectly: use slightly raised dark channels
    ctx.fillStyle = 'rgb(72,196,220)'; ctx.beginPath(); ctx.arc(cx - R * 0.45, cy + R * 0.30, R, 0, Math.PI * 2); ctx.fill();   // C
    ctx.fillStyle = 'rgb(220,72,160)'; ctx.beginPath(); ctx.arc(cx + R * 0.45, cy + R * 0.30, R, 0, Math.PI * 2); ctx.fill();   // M
    ctx.fillStyle = 'rgb(245,228,72)'; ctx.beginPath(); ctx.arc(cx, cy - R * 0.55, R, 0, Math.PI * 2); ctx.fill();              // Y
    if (useK) { ctx.fillStyle = 'rgb(10,10,10)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.42, 0, Math.PI * 2); ctx.fill(); }      // K patch over the centre
    ctx.restore();
    // labels
    ctx.fillStyle = theme.ink; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('C', cx - R * 0.9, cy + R * 0.30 - R - 8);
    ctx.fillText('M', cx + R * 0.9, cy + R * 0.30 - R - 8);
    ctx.fillText('Y', cx, cy - R * 1.55);

    // ink tally bars
    const tx = 40, ty = h - 90, tw = 200, th = 12;
    const cmy = useK ? 60 : 100, k = useK ? 100 : 0;
    ctx.fillStyle = theme.inkAlpha(0.1); ctx.fillRect(tx, ty, tw, th * 4 + 12);
    const bar = (i: number, label: string, pct: number, col: string) => {
      const y = ty + 4 + i * (th + 6);
      ctx.fillStyle = theme.ink; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, tx + 6, y + th - 2);
      ctx.fillStyle = col; ctx.fillRect(tx + 36, y, (tw - 60) * pct / 100, th);
      ctx.fillStyle = theme.inkSoft; ctx.textAlign = 'right'; ctx.fillText(`${pct}%`, tx + tw - 4, y + th - 2);
    };
    bar(0, 'C', cmy, '#00aeef'); bar(1, 'M', cmy, '#ec008c'); bar(2, 'Y', cmy, '#fff200'); bar(3, 'K', k, '#231f20');
    const total = cmy * 3 + k;
    ctx.fillStyle = theme.ink; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`total ink load ${total}%`, tx + 6, ty + th * 4 + 30);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(useK
      ? 'K on — the centre is true black; GCR has cut CMY to 60% under the neutral'
      : '100/100/100 CMY — the centre still reads muddy brown, never a clean black', w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new CmykWhyK());
