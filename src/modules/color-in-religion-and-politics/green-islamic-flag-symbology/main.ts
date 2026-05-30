import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const FLAGS = [
  { name: 'Saudi Arabia', green: '#006c35', tale: 'Shahada in white Thuluth on field green' },
  { name: 'Pakistan', green: '#01411c', tale: 'green field + white stripe (minorities) + crescent + star' },
  { name: 'Iran', green: '#239f40', tale: 'green/white/red tricolor with Allah emblem' },
  { name: 'Bangladesh', green: '#006a4e', tale: 'green field + red disc (sun over delta)' },
  { name: 'Mauritania', green: '#00a651', tale: 'green field + crescent + star + red stripes (2017)' },
];

class IslamicGreen {
  private stage: CanvasStage;
  private f = 1;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.f = hydrateNumber('f', 1);
    const s = document.getElementById('f') as EncSlider; s.value = this.f;
    s.addEventListener('input', (e) => { this.f = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('f', () => Math.round(this.f));
    document.addEventListener('reset-params', () => { this.f = 1; s.value = 1; this.draw(); notifyStateChange(); });
  }

  private drawCrescent(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
    g.fillStyle = col;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(cx + r * 0.35, cy - r * 0.05, r * 0.85, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  private drawStar(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, points = 5) {
    g.fillStyle = col;
    g.beginPath();
    for (let k = 0; k < points * 2; k++) {
      const a = (k / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? r : r * 0.4;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fill();
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const sel = FLAGS[this.f - 1];

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`${sel.name} — ${sel.tale}`, M, M);

    // Flag (large, 3:2)
    const fx = M, fy = M + 30, fw = (w - 2 * M) * 0.7, fh = fw * 2 / 3;
    g.fillStyle = sel.green; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = theme.inkAlpha(0.6); g.strokeRect(fx, fy, fw, fh);

    if (sel.name === 'Saudi Arabia') {
      g.fillStyle = '#fff'; g.font = `bold ${Math.floor(fh * 0.2)}px serif`; g.textAlign = 'center';
      g.fillText('لا إله إلا الله محمد رسول الله', fx + fw / 2, fy + fh * 0.45);
      // Sword
      g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(fx + fw * 0.2, fy + fh * 0.65); g.lineTo(fx + fw * 0.8, fy + fh * 0.65); g.stroke();
    } else if (sel.name === 'Pakistan') {
      // White stripe on hoist
      g.fillStyle = '#fff'; g.fillRect(fx, fy, fw * 0.25, fh);
      // Crescent and star (centred in green portion)
      const ccx = fx + fw * 0.6, ccy = fy + fh / 2;
      this.drawCrescent(g, ccx, ccy, fh * 0.2, '#fff');
      this.drawStar(g, ccx + fh * 0.25, ccy - fh * 0.08, fh * 0.07, '#fff', 5);
    } else if (sel.name === 'Iran') {
      g.fillStyle = '#fff'; g.fillRect(fx, fy + fh / 3, fw, fh / 3);
      g.fillStyle = '#da0000'; g.fillRect(fx, fy + 2 * fh / 3, fw, fh / 3);
      // Allah emblem (centred)
      g.fillStyle = '#da0000'; g.font = `bold ${Math.floor(fh * 0.18)}px serif`; g.textAlign = 'center';
      g.fillText('الله', fx + fw / 2, fy + fh / 2 + fh * 0.04);
    } else if (sel.name === 'Bangladesh') {
      g.fillStyle = '#f42a41';
      g.beginPath(); g.arc(fx + fw * 0.45, fy + fh / 2, fh * 0.3, 0, Math.PI * 2); g.fill();
    } else if (sel.name === 'Mauritania') {
      // Red stripes top + bottom (2017 update)
      g.fillStyle = '#d01c1f';
      g.fillRect(fx, fy, fw, fh * 0.1);
      g.fillRect(fx, fy + fh * 0.9, fw, fh * 0.1);
      // Crescent (horns up) + star
      const ccx = fx + fw / 2, ccy = fy + fh * 0.55;
      g.fillStyle = '#ffd700';
      g.beginPath(); g.arc(ccx, ccy, fh * 0.22, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(ccx, ccy + fh * 0.07, fh * 0.22, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      this.drawStar(g, ccx, ccy - fh * 0.15, fh * 0.08, '#ffd700', 5);
    }

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText(`${sel.name} national flag`, fx + fw / 2, fy + fh + 16);

    // Right: colour swatch + meaning
    const sx = fx + fw + 30, sy = fy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('green shade', sx, sy);
    g.fillStyle = sel.green; g.fillRect(sx, sy + 10, 100, 100);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(sx, sy + 10, 100, 100);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif';
    g.fillText(sel.green.toUpperCase(), sx, sy + 128);

    g.fillStyle = theme.ink; g.font = 'bold 13px serif';
    g.fillText('all green-flagged nations', sx, sy + 160);
    for (let i = 0; i < FLAGS.length; i++) {
      const yy = sy + 180 + i * 22;
      const focus = (i === this.f - 1);
      g.fillStyle = FLAGS[i].green; g.fillRect(sx, yy - 12, 22, 16);
      g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(sx, yy - 12, 22, 16);
      g.fillStyle = focus ? theme.ink : theme.inkAlpha(0.55);
      g.font = focus ? 'bold 11px serif' : '11px serif'; g.textAlign = 'left';
      g.fillText(FLAGS[i].name, sx + 30, yy);
    }

    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Hadith mentions the Prophet\'s green cloak; Qur\'an 76:21 — paradise inhabitants wear "garments of fine green silk."', M, h - M);
  }
}

new IslamicGreen();
