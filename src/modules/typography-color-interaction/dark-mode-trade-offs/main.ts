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

const LINES = ['Reading at night, dark mode', 'emits far less light and on', 'OLED costs less power. But a', 'blurry eye sees light text', 'bloom into haloes on black.'];

class DarkMode {
  private stage: CanvasStage;
  private blur = 40; private mode = 'dark';

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.blur = hydrateNumber('blur', 40); this.mode = hydrateFromUrl('mode') ?? 'dark';
    const s = document.getElementById('blur') as EncSlider;
    s.value = this.blur;
    s.addEventListener('input', (e) => { this.blur = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('blur', () => Math.round(this.blur));
    const t = document.getElementById('mode') as EncToggle;
    t.value = this.mode;
    t.addEventListener('change', (e) => { this.mode = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('mode', () => this.mode);
    document.addEventListener('reset-params', () => { this.blur = 40; this.mode = 'dark'; s.value = 40; t.value = 'dark'; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    const dark = this.mode === 'dark';
    const bg = dark ? '#15151c' : '#f6f4ee', fg = dark ? '#eceaf2' : '#1a1a22';
    const px = 30, py = 36, pw = w * 0.6, ph = h - 96;
    ctx.fillStyle = theme.paperBg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bg; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);

    const blurPx = (this.blur / 100) ** 1.4 * 5;
    // halation glow only when light text on dark (bright strokes bloom)
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    if (dark && blurPx > 0.3) { ctx.filter = `blur(${blurPx * 1.6}px)`; ctx.fillStyle = fg; ctx.font = '700 26px Inter, sans-serif'; ctx.textAlign = 'left'; LINES.forEach((ln, i) => ctx.fillText(ln, px + 24, py + 56 + i * 42)); ctx.filter = 'none'; }
    ctx.filter = blurPx > 0.3 ? `blur(${blurPx * (dark ? 1.0 : 0.7)}px)` : 'none';
    ctx.fillStyle = fg; ctx.font = '700 26px Inter, sans-serif'; ctx.textAlign = 'left';
    LINES.forEach((ln, i) => ctx.fillText(ln, px + 24, py + 56 + i * 42));
    ctx.restore(); ctx.filter = 'none';

    // pros/cons
    const tx = px + pw + 30;
    ctx.fillStyle = theme.slate; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(dark ? 'dark mode +' : 'light mode +', tx, py + 24);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    (dark ? ['less light at night', 'OLED power saving', 'less glare in the dark'] : ['sharper for blurry eyes', 'better in bright rooms', 'counters stay open']).forEach((s, i) => ctx.fillText('· ' + s, tx, py + 46 + i * 20));
    ctx.fillStyle = theme.crimson; ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(dark ? 'dark mode −' : 'light mode −', tx, py + 130);
    ctx.fillStyle = theme.inkMute; ctx.font = '12px Inter, sans-serif';
    (dark ? ['halation for astigmatism', 'worse in bright ambient', 'thin text vanishes'] : ['more light emitted', 'glare in a dark room']).forEach((s, i) => ctx.fillText('· ' + s, tx, py + 152 + i * 20));

    ctx.fillStyle = theme.goldDeep; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(dark ? 'raise the blur: light-on-dark haloes and fills in — a real cost for many eyes' : 'dark-on-light degrades more gracefully as focus blurs', px + pw / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new DarkMode());
