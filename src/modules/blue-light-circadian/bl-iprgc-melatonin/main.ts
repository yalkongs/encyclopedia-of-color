import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/toggle';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { EncToggle } from '@core/components/toggle';
import { theme, axisStyle } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber, hydrateFromUrl } from '@core/state/url-state';

const ELO = 1, EHI = 10000, SMAX = 0.8, N = 1.0;
const MARKERS = [
  { e: 40, label: 'evening phone' },
  { e: 250, label: 'indoor room' },
  { e: 5000, label: 'overcast sky' },
  { e: 10000, label: 'daylight' },
];

class Melatonin {
  private stage: CanvasStage;
  private lux = 35;       // slider 0..100 → log illuminance
  private dur = 'long';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.lux = hydrateNumber('lux', 35);
    this.dur = hydrateFromUrl('dur') ?? 'long';
    const s = document.getElementById('lux') as EncSlider;
    s.value = this.lux;
    s.addEventListener('input', (e) => { this.lux = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('lux', () => Math.round(this.lux));
    const t = document.getElementById('dur') as EncToggle;
    t.value = this.dur;
    t.addEventListener('change', (e) => { this.dur = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('dur', () => this.dur);
    document.addEventListener('reset-params', () => { this.lux = 35; this.dur = 'long'; s.value = 35; t.value = 'long'; this.draw(); notifyStateChange(); });
  }

  private e50(): number { return this.dur === 'long' ? 100 : 250; }
  private suppression(E: number): number { const e50 = this.e50(); return SMAX * Math.pow(E, N) / (Math.pow(E, N) + Math.pow(e50, N)); }
  private sliderToE(): number { return Math.pow(10, (this.lux / 100) * Math.log10(EHI / ELO)) * ELO; }
  private xMap(E: number, gx: number, gw: number): number { return gx + (Math.log10(Math.max(ELO, E) / ELO) / Math.log10(EHI / ELO)) * gw; }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    const gx = 60, gy = 32, gw = w - 104, gh = h - 110;
    const Ys = (sFrac: number) => gy + gh - sFrac * gh;

    ctx.strokeStyle = axisStyle.grid; ctx.lineWidth = 1; ctx.fillStyle = theme.inkSoft; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
    for (const dec of [1, 10, 100, 1000, 10000]) { const x = this.xMap(dec, gx, gw); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); }
    for (let i = 0; i <= 5; i++) { const y = gy + (i / 5) * gh; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); ctx.fillText(`${100 - i * 20}%`, gx - 8, y + 3); }
    ctx.strokeStyle = axisStyle.baseline; ctx.lineWidth = 1.2; ctx.strokeRect(gx, gy, gw, gh);

    // curve (plot suppression as % of its own max → 0..1 of axis where axis 100% = full melatonin suppression cap)
    ctx.strokeStyle = theme.crimson; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const E = Math.pow(10, (i / 300) * Math.log10(EHI / ELO)) * ELO; const sFrac = this.suppression(E); const x = this.xMap(E, gx, gw), y = Ys(sFrac); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();

    // markers
    ctx.font = '11px Inter, sans-serif';
    for (const m of MARKERS) { const x = this.xMap(m.e, gx, gw); ctx.strokeStyle = theme.inkAlpha(0.35); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.setLineDash([]); ctx.save(); ctx.translate(x + 4, gy + gh - 8); ctx.rotate(-Math.PI / 2); ctx.fillStyle = theme.inkSoft; ctx.textAlign = 'left'; ctx.fillText(m.label, 0, 0); ctx.restore(); }

    // probe
    const E = this.sliderToE(), sFrac = this.suppression(E);
    const px = this.xMap(E, gx, gw);
    ctx.strokeStyle = theme.slate; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = theme.gold; ctx.beginPath(); ctx.arc(px, Ys(sFrac), 5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = theme.inkSoft; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('melanopic illuminance (lux, log)', gx + gw / 2, gy + gh + 30);
    ctx.save(); ctx.translate(gx - 42, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('melatonin suppression', 0, 0); ctx.restore();

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(E)} melanopic lux → ~${(sFrac * 100).toFixed(0)}% suppression (illustrative, ${this.dur === 'long' ? '~3 h' : '~30 min'} exposure)`, gx + gw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new Melatonin());
