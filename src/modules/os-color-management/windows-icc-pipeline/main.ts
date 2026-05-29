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

const NAMES = ['camera', 'scanner', 'monitor', 'printer', 'phone', 'projector', 'tablet', 'press', 'TV'];

class ICCPipeline {
  private stage: CanvasStage;
  private devices = 5;
  private pcs = 'on';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.devices = hydrateNumber('devices', 5);
    this.pcs = hydrateFromUrl('pcs') ?? 'on';
    const s = document.getElementById('devices') as EncSlider;
    s.value = this.devices;
    s.addEventListener('input', (e) => { this.devices = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('devices', () => Math.round(this.devices));
    const t = document.getElementById('pcs') as EncToggle;
    t.value = this.pcs;
    t.addEventListener('change', (e) => { this.pcs = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('pcs', () => this.pcs);
    document.addEventListener('reset-params', () => { this.devices = 5; this.pcs = 'on'; s.value = 5; t.value = 'on'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const n = Math.round(this.devices);
    const cx = w / 2, cy = (h - 40) / 2 + 10, R = Math.min(w, h) * 0.32;
    const usePcs = this.pcs === 'on';

    const pts = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), name: NAMES[i] };
    });

    // edges
    ctx.lineWidth = 1.4;
    if (usePcs) {
      ctx.strokeStyle = theme.inkAlpha(0.5);
      for (const p of pts) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    } else {
      ctx.strokeStyle = 'rgba(155,40,40,0.4)';
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
    }

    // PCS hub
    if (usePcs) {
      ctx.fillStyle = theme.gold; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1712'; ctx.font = '700 13px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PCS', cx, cy + 4);
    }

    // device nodes
    for (const p of pts) {
      ctx.fillStyle = theme.slate; ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = theme.paperBg; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.name, p.x, p.y + 4);
    }

    const profiles = usePcs ? n : (n * (n - 1)) / 2;
    ctx.fillStyle = theme.ink; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(usePcs ? `${n} profiles (one per device → PCS)` : `${profiles} direct conversions (every pair)`, 40, 32);

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(usePcs
      ? `the hub keeps it linear — add a device, add one profile (${n})`
      : `no hub — ${profiles} bespoke transforms for ${n} devices, and it grows as N²`, w / 2, h - 16);
  }
}
window.addEventListener('DOMContentLoaded', () => new ICCPipeline());
