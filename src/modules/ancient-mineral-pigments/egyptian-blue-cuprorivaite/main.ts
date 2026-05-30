import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

class EgyptianBlue {
  private stage: CanvasStage;
  private ir = 0;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.ir = hydrateNumber('ir', 0);
    const s = document.getElementById('ir') as EncSlider; s.value = this.ir;
    s.addEventListener('input', (e) => { this.ir = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('ir', () => this.ir.toFixed(2));
    document.addEventListener('reset-params', () => { this.ir = 0; s.value = 0; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const g = this.stage.context;
    g.fillStyle = theme.paperBg; g.fillRect(0, 0, w, h);

    const M = 30;
    const t = this.ir;
    const mode = t < 0.5 ? 'visible-light view of wall painting' : 'IR camera (910 nm luminescence)';

    g.fillStyle = theme.ink; g.font = '14px serif'; g.textAlign = 'left';
    g.fillText(`mode = ${mode}`, M, M);

    // Egyptian wall painting scene
    const wx = M, wy = M + 30, ww = (w - 2 * M) * 0.55, wh = h - 2 * M - 70;
    // Background wall: ochre in visible, near-black in IR
    g.fillStyle = `rgb(${Math.round(196 - 180 * t)},${Math.round(170 - 160 * t)},${Math.round(120 - 110 * t)})`;
    g.fillRect(wx, wy, ww, wh);

    // Painting elements: pharaoh figure
    // Skin (ochre)
    const figR = 'rgb(180,120,80)';
    const figRir = 'rgb(20,20,20)';
    const skin = `rgb(${Math.round(180 - 160 * t)},${Math.round(120 - 100 * t)},${Math.round(80 - 60 * t)})`;
    void figR; void figRir;
    g.fillStyle = skin;
    // Head
    g.beginPath(); g.ellipse(wx + ww / 2 - 60, wy + wh / 2 - 80, 22, 28, 0, 0, Math.PI * 2); g.fill();
    // Body
    g.fillRect(wx + ww / 2 - 80, wy + wh / 2 - 50, 40, 80);
    // Skirt
    g.fillStyle = skin;
    g.beginPath(); g.moveTo(wx + ww / 2 - 80, wy + wh / 2 + 30); g.lineTo(wx + ww / 2 - 95, wy + wh / 2 + 90);
    g.lineTo(wx + ww / 2 - 45, wy + wh / 2 + 90); g.lineTo(wx + ww / 2 - 60, wy + wh / 2 + 30); g.closePath(); g.fill();

    // Egyptian blue crown: bright in IR, normal blue in visible
    const blueCol = t < 0.5
      ? `rgb(${Math.round(60 + 60 * t * 2)},${Math.round(90 + 90 * t * 2)},${Math.round(170 + 70 * t * 2)})`
      : `rgb(255,180,180)`;
    g.fillStyle = blueCol;
    g.beginPath(); g.ellipse(wx + ww / 2 - 60, wy + wh / 2 - 105, 26, 14, 0, Math.PI, 0); g.fill();
    g.fillRect(wx + ww / 2 - 78, wy + wh / 2 - 110, 4, 30);
    g.fillRect(wx + ww / 2 - 46, wy + wh / 2 - 110, 4, 30);

    // Lotus pattern around: more blue paint
    for (let i = 0; i < 5; i++) {
      const lx = wx + ww / 2 + 30 + (i % 2) * 40;
      const ly = wy + 40 + i * 60;
      g.fillStyle = blueCol;
      g.beginPath(); g.ellipse(lx, ly, 16, 22, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(0,0,0,${0.4 - t * 0.4})`;
      g.lineWidth = 1.5;
      g.stroke();
    }

    // Hieroglyph row at the bottom
    for (let k = 0; k < 6; k++) {
      g.fillStyle = blueCol;
      g.fillRect(wx + 30 + k * 50, wy + wh - 60, 20, 30);
      g.strokeStyle = `rgba(0,0,0,${0.3 - t * 0.3})`;
      g.strokeRect(wx + 30 + k * 50, wy + wh - 60, 20, 30);
    }
    g.strokeStyle = theme.inkAlpha(0.5);
    g.strokeRect(wx, wy, ww, wh);
    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('Wall painting (~Karnak, 19th dynasty replica)', wx + ww / 2, wy + wh + 16);

    // Right: chemistry diagram
    const sx = wx + ww + 40, sy = wy + 20;
    g.fillStyle = theme.ink; g.font = 'bold 13px serif'; g.textAlign = 'left';
    g.fillText('CaCuSi₄O₁₀ — cuprorivaite', sx, sy);

    // Square planar Cu
    const px = sx + 100, py = sy + 80;
    g.strokeStyle = theme.ink; g.lineWidth = 1.5;
    // O atoms at corners
    const offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [dx, dy] of offs) {
      g.fillStyle = '#c83820';
      g.beginPath(); g.arc(px + dx * 40, py + dy * 40, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 10px serif'; g.textAlign = 'center';
      g.fillText('O', px + dx * 40, py + dy * 40 + 4);
      // bond
      g.strokeStyle = theme.ink; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + dx * 28, py + dy * 28); g.stroke();
    }
    g.fillStyle = '#3a76a8';
    g.beginPath(); g.arc(px, py, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 11px serif'; g.textAlign = 'center';
    g.fillText('Cu²⁺', px, py + 4);

    g.fillStyle = theme.inkAlpha(0.7); g.font = '11px serif'; g.textAlign = 'center';
    g.fillText('square-planar O₄ ligand', px, py + 70);
    g.fillText('d-d transition near 630 nm → blue', px, py + 86);

    // Footnote
    g.fillStyle = theme.inkAlpha(0.65); g.font = '11px serif'; g.textAlign = 'left';
    g.fillText('Egyptian Blue glows in IR because Cu²⁺ has a strong, narrow 910 nm emission. Conservators use IR cameras to detect retouches on ancient murals.', M, h - M);
  }
}

new EgyptianBlue();
