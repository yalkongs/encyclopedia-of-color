import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

// Approximate daylight hours at latitude 55° (London-Edinburgh band) per month
const DAYLIGHT = [8, 10, 12, 14, 16, 17, 16, 14, 12, 10, 8, 7];

class SAD {
  private stage: CanvasStage;
  private m = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.m = hydrateNumber('m', 1);
    const s = document.getElementById('m') as EncSlider; s.value = this.m;
    s.addEventListener('input', (e) => { this.m = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('m', () => Math.round(this.m));
    document.addEventListener('reset-params', () => { this.m = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const monthIdx = Math.round(this.m) - 1;
    const daylight = DAYLIGHT[monthIdx];
    // SAD risk: maps low daylight (≤9) → high risk
    const sadRisk = Math.max(0, (10 - daylight) / 10);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`month: ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIdx]} · daylight = ${daylight} h · SAD risk index ${(sadRisk * 100).toFixed(0)} %`, M, M);

    // 24h clock with day/night band
    const cx = M + 130, cy = M + 180, cr = 110;
    g.fillStyle = '#0a0a30'; g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill();
    // Day arc
    const dayStart = -Math.PI / 2 - (daylight / 24) * Math.PI;
    const dayEnd = -Math.PI / 2 + (daylight / 24) * Math.PI;
    g.fillStyle = '#f0c860';
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, cr, dayStart, dayEnd); g.closePath(); g.fill();
    g.strokeStyle = theme.inkAlpha(0.6); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.stroke();
    // 24 ticks
    for (let h0 = 0; h0 < 24; h0++) {
      const angle = -Math.PI / 2 + (h0 / 24) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * cr;
      const y1 = cy + Math.sin(angle) * cr;
      const x2 = cx + Math.cos(angle) * (cr - 6);
      const y2 = cy + Math.sin(angle) * (cr - 6);
      g.strokeStyle = '#fff'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('24h day/night', cx, cy + cr + 24);

    // SAD risk bar (right)
    const bx = cx + cr + 80, by = cy - 100, bw = 60, bh = 220;
    g.strokeStyle = theme.inkAlpha(0.5); g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
    g.fillStyle = '#a82828';
    const fillH = sadRisk * bh;
    g.fillRect(bx + 4, by + bh - fillH, bw - 8, fillH);
    g.fillStyle = theme.ink; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('SAD risk', bx + bw / 2, by + bh + 16);
    g.font = '14px serif'; g.fillStyle = '#a82828';
    g.fillText(`${(sadRisk * 100).toFixed(0)} %`, bx + bw / 2, by + bh + 34);

    // Treatment box
    const tx = bx + bw + 50, ty = by;
    g.fillStyle = '#3a76a8'; g.fillRect(tx, ty, 130, 80);
    g.fillStyle = '#fff'; g.font = 'bold 12px serif'; g.textAlign = 'center';
    g.fillText('10,000-lux light box', tx + 65, ty + 30);
    g.font = '10px serif';
    g.fillText('30 min after waking', tx + 65, ty + 50);
    g.fillText('blue 480 nm = melanopsin peak', tx + 65, ty + 66);

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Above 50° latitude: SAD prevalence ~5-10%. Below 30°: ~1%. Light therapy alleviates ~80% of cases within 1-2 weeks.', M, h - M);
  }
}

new SAD();
