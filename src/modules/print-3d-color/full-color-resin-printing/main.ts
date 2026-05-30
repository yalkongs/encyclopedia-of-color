import '@core/components/canvas-stage';
import '@core/components/module-shell';
import '@core/components/slider';
import '@core/components/citation-footer';
import { CanvasStage } from '@core/components/canvas-stage';
import { EncSlider } from '@core/components/slider';
import { theme } from '@core/render/theme';
import { registerStateParam, notifyStateChange, hydrateNumber } from '@core/state/url-state';

const COLS = 14, ROWS = 16;
function voxelColor(c: number, r: number): string {
  const u = c / (COLS - 1), v = r / (ROWS - 1);
  const hue = u * 320, sat = 0.7, l = 0.55 - 0.3 * v;
  const cc = (1 - Math.abs(2 * l - 1)) * sat, hp = hue / 60, x = cc * (1 - Math.abs((hp % 2) - 1));
  let rr = 0, gg = 0, bb = 0;
  if (hp < 1) [rr, gg, bb] = [cc, x, 0]; else if (hp < 2) [rr, gg, bb] = [x, cc, 0];
  else if (hp < 3) [rr, gg, bb] = [0, cc, x]; else if (hp < 4) [rr, gg, bb] = [0, x, cc];
  else if (hp < 5) [rr, gg, bb] = [x, 0, cc]; else [rr, gg, bb] = [cc, 0, x];
  const m = l - cc / 2; const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(rr)}${to(gg)}${to(bb)}`;
}
function inPart(c: number, r: number): boolean {
  const u = (c - COLS / 2) / (COLS * 0.5), v = (r - ROWS / 2) / (ROWS * 0.5);
  return u * u * 1.1 + v * v * 0.9 < 0.85 && r >= 1 && r <= ROWS - 2;
}

class PolyJetResin {
  private stage: CanvasStage;
  private progress = 55;

  constructor() {
    this.stage = document.getElementById('stage') as CanvasStage;
    this.stage.addEventListener('stageresize', () => this.draw());
    this.progress = hydrateNumber('progress', 55);
    const s = document.getElementById('progress') as EncSlider;
    s.value = this.progress;
    s.addEventListener('input', (e) => { this.progress = (e as CustomEvent).detail.value; this.draw(); notifyStateChange(); });
    registerStateParam('progress', () => Math.round(this.progress));
    document.addEventListener('reset-params', () => { this.progress = 55; s.value = 55; this.draw(); notifyStateChange(); });
  }

  private draw() {
    const { w, h } = this.stage.logicalSize;
    if (w === 0 || h === 0) return;
    const ctx = this.stage.context;
    ctx.fillStyle = '#0f1015'; ctx.fillRect(0, 0, w, h);
    const layersDone = Math.round((this.progress / 100) * ROWS);

    // LEFT: process diagram — print head row + UV lamp (no powder bed)
    const lx0 = 30, ly0 = 60, lw = Math.min(w * 0.46, 460), lh = h - 130;
    ctx.fillStyle = '#1f1d24'; ctx.fillRect(lx0, ly0 + lh - 24, lw, 24);  // build platform (steel)
    // built part stack (resin-glossy look — saturated colour, slight highlight)
    const layerH = 10;
    for (let r = 0; r < layersDone; r++) {
      const ry = ly0 + lh - 24 - (r + 1) * layerH;
      for (let c = 0; c < COLS; c++) {
        if (!inPart(c, ROWS - 1 - r)) continue;
        const cw = (lw - 30) / COLS, cx = lx0 + 15 + c * cw;
        ctx.fillStyle = voxelColor(c, ROWS - 1 - r);
        ctx.fillRect(cx, ry, cw - 1, layerH - 1);
        ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(cx, ry, cw - 1, 2); // glossy highlight
      }
    }
    // print-head carriage above
    const carY = ly0 + 10;
    ctx.fillStyle = '#2b2935'; ctx.fillRect(lx0 + 10, carY, lw - 20, 38);
    // jets (CMY W clear) along the head
    const jets = ['#00aeef', '#ec008c', '#fff200', '#ffffff', 'rgba(220,220,230,0.4)'];
    const labels = ['C', 'M', 'Y', 'W', 'clear'];
    const sw = (lw - 40) / jets.length;
    jets.forEach((col, i) => {
      const sx = lx0 + 16 + i * sw + 4; ctx.fillStyle = col; ctx.fillRect(sx, carY + 26, sw - 8, 8);
      ctx.fillStyle = '#c9c4d3'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(labels[i], sx + (sw - 8) / 2, carY + 50);
    });
    // UV strip at the trailing edge of the carriage
    ctx.fillStyle = '#8a4dff'; ctx.fillRect(lx0 + 10, carY + 38, lw - 20, 6);
    ctx.fillStyle = 'rgba(138,77,255,0.18)'; ctx.fillRect(lx0 + 10, carY + 44, lw - 20, ly0 + lh - 24 - (carY + 44));
    ctx.fillStyle = '#e3def0'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('print head: C · M · Y · W · clear   |   UV lamp cures behind', lx0 + 14, carY + 22);
    // falling droplets mid-air just below jets
    for (let i = 0; i < jets.length; i++) {
      const sx = lx0 + 16 + i * sw + sw / 2 - 4;
      for (let k = 0; k < 4; k++) { ctx.fillStyle = jets[i]; ctx.beginPath(); ctx.arc(sx, carY + 50 + k * 22, 2.4, 0, Math.PI * 2); ctx.fill(); }
    }

    // RIGHT: voxel build object (no powder fill — empty above the build)
    const rx0 = lx0 + lw + 36, ry0 = ly0, rw = w - rx0 - 30, rh = lh;
    ctx.fillStyle = '#1f1d24'; ctx.fillRect(rx0, ry0 + rh - 16, rw, 16);
    const cellW = (rw - 20) / COLS, cellH = (rh - 30) / ROWS;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!inPart(c, r)) continue;
      if ((ROWS - 1 - r) >= layersDone) continue;
      ctx.fillStyle = voxelColor(c, r);
      ctx.fillRect(rx0 + 10 + c * cellW, ry0 + 14 + r * cellH, cellW - 1, cellH - 1);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(rx0 + 10 + c * cellW, ry0 + 14 + r * cellH, cellW - 1, 2);
    }
    ctx.strokeStyle = theme.inkAlpha(0.3); ctx.lineWidth = 1; ctx.strokeRect(rx0, ry0, rw, rh);
    ctx.fillStyle = '#e3def0'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('build volume', rx0 + 10, ry0 - 6);

    ctx.fillStyle = theme.gold; ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${layersDone} of ${ROWS} layers · liquid resin droplets cured by UV in the same sweep`, w / 2, h - 14);
  }
}
window.addEventListener('DOMContentLoaded', () => new PolyJetResin());
