import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class Sepia {
  private stage: CanvasStage;
  private c = 0.5;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.c = hydrateNumber('c', 0.5);
    const s = document.getElementById('c') as EncSlider; s.value = this.c;
    s.addEventListener('input', (e) => { this.c = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('c', () => this.c.toFixed(2));
    document.addEventListener('reset-params', () => { this.c = 0.5; s.value = 0.5; this.draw(); notifyStateChange(); });
  }

  private inkRgb(c: number): string {
    // Beer-Lambert style: optical density grows with c; reflectance R = exp(-k*c)
    // Sepia warm-brown base #6b3f1f → near-black as c → 1
    const k = 3.5;
    const T = Math.exp(-k * c);
    const baseR = 0x6b, baseG = 0x3f, baseB = 0x1f;
    const r = Math.round(baseR * T + 30 * (1 - T));
    const gC = Math.round(baseG * T + 18 * (1 - T));
    const b = Math.round(baseB * T + 10 * (1 - T));
    return `rgb(${r},${gC},${b})`;
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const col = this.inkRgb(this.c);

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`Concentration = ${this.c.toFixed(2)} · sepia ink colour = ${col}`, M, M);

    // Drawing test sheet
    const px = M, py = M + 30, pw = (w - 2 * M) * 0.55, ph = h - 2 * M - 60;
    g.fillStyle = '#f3e9d4'; g.fillRect(px, py, pw, ph);
    g.strokeStyle = theme.inkAlpha(0.5); g.strokeRect(px, py, pw, ph);

    // Sample brushstrokes — three thicknesses
    g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(px + 20, py + 40); g.bezierCurveTo(px + 80, py + 20, px + 160, py + 60, px + pw - 20, py + 30); g.stroke();
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(px + 20, py + 80); g.bezierCurveTo(px + 100, py + 60, px + 200, py + 100, px + pw - 20, py + 70); g.stroke();
    g.lineWidth = 12;
    g.beginPath(); g.moveTo(px + 30, py + 130); g.bezierCurveTo(px + 120, py + 110, px + 220, py + 150, px + pw - 30, py + 120); g.stroke();

    // Wash band (variable opacity strip)
    const wx = px + 20, wy = py + 170, ww = pw - 40, wh = 40;
    for (let i = 0; i < ww; i++) {
      const alpha = (i / ww) * this.c;
      g.fillStyle = `rgba(60,30,15,${alpha})`;
      g.fillRect(wx + i, wy, 1, wh);
    }
    g.strokeStyle = theme.inkAlpha(0.4); g.strokeRect(wx, wy, ww, wh);

    // Calligraphic stroke at bottom
    g.strokeStyle = col; g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < pw - 40; i++) {
      const t = i / (pw - 40);
      const yy = py + ph - 60 + Math.sin(t * Math.PI * 3) * 14;
      if (i === 0) g.moveTo(px + 20 + i, yy); else g.lineTo(px + 20 + i, yy);
    }
    g.stroke();

    // Eumelanin polymer schematic (right)
    const ex = px + pw + 30, ey = py + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('eumelanin polymer (5,6-dihydroxyindole units)', ex, ey);

    // Draw 8 connected pentagon-hexagon DHI fragments
    const nodes: { x: number; y: number }[] = [];
    for (let i = 0; i < 8; i++) {
      nodes.push({ x: ex + 20 + (i % 4) * 80, y: ey + 30 + Math.floor(i / 4) * 90 });
    }
    g.strokeStyle = theme.inkAlpha(0.7); g.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      // Pentagon (indole)
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        const xx = n.x + Math.cos(a) * 10, yy = n.y + Math.sin(a) * 10;
        if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.closePath(); g.stroke();
      // Hexagon (benzene fused)
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const xx = n.x + 16 + Math.cos(a) * 11, yy = n.y + Math.sin(a) * 11;
        if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.closePath(); g.stroke();
      // OH groups
      g.fillStyle = theme.crimson; g.font = '9px serif'; g.textAlign = 'center';
      g.fillText('OH', n.x + 30, n.y - 2);
      g.fillText('OH', n.x + 30, n.y + 10);
    }
    // Connect with bonds
    g.strokeStyle = theme.inkAlpha(0.5);
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      g.beginPath(); g.moveTo(a.x + 25, a.y); g.lineTo(b.x - 10, b.y); g.stroke();
    }

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Eumelanin is a "disordered polymer" — no single molecular weight, just stacked oligomer units. Its broadband absorption explains why "sepia" looks neutral-brown.', M, h - M);
  }
}

new Sepia();
